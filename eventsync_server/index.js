const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

app.use(cors());
app.use(express.json());

// In-memory storage (replace with database in production)
let events = [];

// Helper function to check event status
const updateEventStatus = (event) => {
  const now = new Date();
  const eventDate = new Date(`${event.date} ${event.time}`);

  if (eventDate < now) {
    return 'completed';
  } else if (Math.abs(eventDate - now) <= 24 * 60 * 60 * 1000) {
    return 'ongoing';
  }
  return 'upcoming';
};

// Socket.io event handlers
io.on('connection', (socket) => {
  console.log('Client connected');

  // Send existing events to newly connected client
  socket.emit('initialEvents', events.map(event => ({
    ...event,
    status: updateEventStatus(event)
  })));

  // Handle new event creation
  socket.on('createEvent', (eventData) => {
    const newEvent = {
      ...eventData,
      status: updateEventStatus(eventData)
    };
    events.push(newEvent);
    io.emit('eventCreated', newEvent);
    
    // Simulate sending invitations
    eventData.attendees.forEach(attendee => {
      setTimeout(() => {
        io.emit('eventNotification', {
          id: Date.now(),
          message: `Invitation sent to ${attendee.email}`,
          type: 'info',
          time: new Date().toISOString()
        });
      }, 1000);
    });

    // Schedule reminders for the new event
    scheduleReminders(newEvent);
  });

  // Handle event updates
  socket.on('updateEvent', (updatedEvent) => {
    const index = events.findIndex(e => e.id === updatedEvent.id);
    if (index !== -1) {
      events[index] = {
        ...updatedEvent,
        status: updateEventStatus(updatedEvent)
      };
      io.emit('eventUpdated', events[index]);
      io.emit('eventNotification', {
        id: Date.now(),
        message: `Event "${updatedEvent.title}" has been updated`,
        type: 'success',
        time: new Date().toISOString()
      });
    }
  });

  // Handle event deletion
  socket.on('deleteEvent', (eventId) => {
    const event = events.find(e => e.id === eventId);
    if (event) {
      events = events.filter(e => e.id !== eventId);
      io.emit('eventDeleted', eventId);
      io.emit('eventNotification', {
        id: Date.now(),
        message: `Event "${event.title}" has been deleted`,
        type: 'warning',
        time: new Date().toISOString()
      });
    }
  });

  // Update event statuses periodically
  const statusUpdate = setInterval(() => {
    let updated = false;
    events = events.map(event => {
      const newStatus = updateEventStatus(event);
      if (event.status !== newStatus) {
        updated = true;
        return { ...event, status: newStatus };
      }
      return event;
    });

    if (updated) {
      io.emit('eventsStatusUpdate', events);
    }
  }, 60000); // Check every minute

  socket.on('disconnect', () => {
    clearInterval(statusUpdate);
    console.log('Client disconnected');
  });
});

// REST endpoints
app.get('/api/events', (req, res) => {
  const updatedEvents = events.map(event => ({
    ...event,
    status: updateEventStatus(event)
  }));
  res.json(updatedEvents);
});

app.post('/api/events', (req, res) => {
  const newEvent = {
    ...req.body,
    status: updateEventStatus(req.body)
  };
  events.push(newEvent);
  io.emit('eventCreated', newEvent);
  res.status(201).json(newEvent);
});

app.put('/api/events/:id', (req, res) => {
  const { id } = req.params;
  const index = events.findIndex(e => e.id === parseInt(id));
  if (index !== -1) {
    events[index] = {
      ...req.body,
      status: updateEventStatus(req.body)
    };
    io.emit('eventUpdated', events[index]);
    res.json(events[index]);
  } else {
    res.status(404).json({ error: 'Event not found' });
  }
});

app.delete('/api/events/:id', (req, res) => {
  const { id } = req.params;
  const index = events.findIndex(e => e.id === parseInt(id));
  if (index !== -1) {
    const deletedEvent = events[index];
    events = events.filter(e => e.id !== parseInt(id));
    io.emit('eventDeleted', parseInt(id));
    res.json(deletedEvent);
  } else {
    res.status(404).json({ error: 'Event not found' });
  }
});

// Stats endpoint
app.get('/api/stats', (req, res) => {
  const stats = {
    totalEvents: events.length,
    upcomingEvents: events.filter(e => e.status === 'upcoming').length,
    ongoingEvents: events.filter(e => e.status === 'ongoing').length,
    completedEvents: events.filter(e => e.status === 'completed').length,
    totalAttendees: events.reduce((acc, event) => acc + event.attendees.length, 0),
    averageAttendance: events.length ? 
      Math.round(
        (events.reduce((acc, event) => 
          acc + (event.attendees.filter(a => a.status === 'confirmed').length / event.attendees.length), 0
        ) / events.length) * 100
      ) : 0
  };
  
  res.json(stats);
});

// Get events for a specific date range
app.get('/api/events/range', (req, res) => {
  const { start, end } = req.query;
  const filteredEvents = events.filter(event => {
    const eventDate = new Date(event.date);
    return eventDate >= new Date(start) && eventDate <= new Date(end);
  });

  res.json(filteredEvents);
});

// Export events to iCal format
app.get('/api/events/export/:id', (req, res) => {
  const event = events.find(e => e.id === parseInt(req.params.id));
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }

  const iCalData = generateICalEvent(event); // Implementation needed
  res.setHeader('Content-Type', 'text/calendar');
  res.setHeader('Content-Disposition', `attachment; filename="${event.title}.ics"`);
  res.send(iCalData);
});

// Reminder scheduling
const scheduleReminders = (event) => {
  const eventDate = new Date(`${event.date} ${event.time}`);
  const reminderTime = new Date(eventDate.getTime() - 24 * 60 * 60 * 1000); // 24 hours before

  if (reminderTime > new Date()) {
    setTimeout(() => {
      event.attendees.forEach(attendee => {
        if (attendee.status === 'confirmed') {
          io.emit('eventReminder', {
            eventId: event.id,
            attendeeEmail: attendee.email,
            message: `Reminder: "${event.title}" is happening tomorrow at ${event.time}`
          });
        }
      });
    }, reminderTime - new Date());
  }
};

// Schedule reminders for all existing events
events.forEach(scheduleReminders);

server.listen(process.env.PORT || 4000, () => {
  console.log(`Server running on port ${process.env.PORT || 4000}`);
});
