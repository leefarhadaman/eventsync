import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, Bell, ChevronRight, Plus, X, Check, Search, Filter, Edit, Trash2, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

const DigitalClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed top-4 left-4 bg-white/90 backdrop-blur-sm p-4 rounded-lg shadow-lg z-50">
      <div className="text-3xl font-mono font-bold text-blue-600">
        {time.toLocaleTimeString('en-US', {
          hour12: true,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })}
      </div>
      <div className="text-sm text-gray-500 mt-1">
        {time.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}
      </div>
    </div>
  );
};

const EventDashboard = () => {
  const [events, setEvents] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    description: '',
    attendees: ''
  });
  const [socket, setSocket] = useState(null);
  const [view, setView] = useState('list');  // Added state to manage the view
  const navigate = useNavigate();

  useEffect(() => {
    const newSocket = io('http://localhost:4000');
    setSocket(newSocket);

    newSocket.on('eventNotification', (notification) => {
      setNotifications(prev => [...prev, { ...notification, id: Date.now() }]);
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 5000);
    });

    newSocket.on('eventUpdated', (updatedEvent) => {
      setEvents(prev => prev.map(event =>
        event.id === updatedEvent.id ? updatedEvent : event
      ));
    });

    newSocket.on('eventCreated', (newEvent) => {
      setEvents(prev => [...prev, newEvent]);
    });

    return () => newSocket.disconnect();
  }, []);

  const handleCreateEvent = () => {
    if (socket) {
      const eventData = {
        ...newEvent,
        id: Date.now(),
        attendees: newEvent.attendees.split(',').map(email => ({
          id: Date.now() + Math.random(),
          email: email.trim(),
          status: 'pending'
        })),
        notifications: [],
        status: 'upcoming'
      };
      socket.emit('createEvent', eventData);
      setShowCreateModal(false);
      setNewEvent({
        title: '',
        date: '',
        time: '',
        location: '',
        description: '',
        attendees: ''
      });
    }
  };

  const handleDeleteEvent = (eventId) => {
    if (socket) {
      socket.emit('deleteEvent', eventId);
      setEvents(prev => prev.filter(event => event.id !== eventId));
    }
  };

  const filteredEvents = events
    .filter(event => event.title.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(event => filterStatus === 'all' || event.status === filterStatus);

  return (
    <div className="min-h-screen bg-gray-50">
      <DigitalClock />

      {/* <div className="mb-6">
        <nav className="flex gap-4">
          <button onClick={() => setView('list')}>List View</button>
          <button onClick={() => setView('calendar')}>Calendar</button>
          <button onClick={() => setView('analytics')}>Analytics</button>
        </nav>
      </div> */}

      <div className="p-6 max-w-6xl mx-auto relative">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-4xl font-bold mb-2 text-gray-800">EventSync Dashboard</h1>
              <p className="text-gray-600">Manage your upcoming events and attendees</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-md"
            >
              <Plus className="h-5 w-5" />
              Create Event
            </button>
          </div>

          <div className="flex gap-4 items-center bg-white p-4 rounded-lg shadow-md">
            <div className="flex-1 relative">
              <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-500" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Events</option>
                <option value="upcoming">Upcoming</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </div>

        <div className="fixed top-20 right-4 w-96 space-y-2 z-50">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className="bg-white p-4 rounded-lg shadow-lg flex items-center justify-between transform transition-all duration-500 hover:scale-102"
            >
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-blue-500" />
                <span className="text-gray-700">{notification.message}</span>
              </div>
              <button
                onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredEvents.map(event => (
            <div
              key={event.id}
              className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow overflow-hidden"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold text-gray-800">{event.title}</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedEvent(event)}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <Edit className="h-5 w-5 text-gray-500" />
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(event.id)}
                      className="p-2 hover:bg-red-100 rounded-full transition-colors"
                    >
                      <Trash2 className="h-5 w-5 text-red-500" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="h-5 w-5" />
                    <span>{event.date}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="h-5 w-5" />
                    <span>{event.time}</span>
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-2 text-gray-600 col-span-2">
                      <MapPin className="h-5 w-5" />
                      <span>{event.location}</span>
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-500">Description</h4>
                  <p className="text-gray-700">{event.description}</p>
                </div>

                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    <Users className="h-4 w-4 inline-block mr-1" />
                    {event.attendees.length} Attendees
                  </div>
                  <button
                    onClick={() => navigate(`/event/${event.id}`)}
                    className="text-blue-600 hover:underline"
                  >
                    View Event
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-800 bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white p-8 rounded-lg shadow-xl w-96">
              <h2 className="text-2xl font-semibold mb-4">Create Event</h2>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Event Title"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
                <input
                  type="date"
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
                <input
                  type="time"
                  value={newEvent.time}
                  onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Location"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
                <textarea
                  placeholder="Event Description"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Attendees (comma separated)"
                  value={newEvent.attendees}
                  onChange={(e) => setNewEvent({ ...newEvent, attendees: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div className="mt-6 flex justify-between">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateEvent}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                >
                  Create Event
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventDashboard;
