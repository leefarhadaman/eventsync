import React from 'react';
import { LineChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const EventAnalytics = ({ events }) => {
  // Process data for charts
  const getMonthlyEventCounts = () => {
    const counts = {};
    events.forEach(event => {
      const month = new Date(event.date).toLocaleString('default', { month: 'short' });
      counts[month] = (counts[month] || 0) + 1;
    });
    return Object.entries(counts).map(([month, count]) => ({ month, count }));
  };

  const getAttendanceStats = () => {
    const stats = events.map(event => ({
      event: event.title,
      confirmed: event.attendees.filter(a => a.status === 'confirmed').length,
      pending: event.attendees.filter(a => a.status === 'pending').length,
      declined: event.attendees.filter(a => a.status === 'declined').length,
    }));
    return stats.slice(-5); // Show last 5 events
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-semibold mb-6">Event Analytics</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-medium mb-4">Monthly Event Distribution</h3>
          <LineChart width={400} height={300} data={getMonthlyEventCounts()}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="count" stroke="#3b82f6" />
          </LineChart>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-4">Attendance Overview</h3>
          <BarChart width={400} height={300} data={getAttendanceStats()}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="event" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="confirmed" fill="#22c55e" stackId="a" />
            <Bar dataKey="pending" fill="#eab308" stackId="a" />
            <Bar dataKey="declined" fill="#ef4444" stackId="a" />
          </BarChart>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-800">Total Events</h4>
          <p className="text-2xl font-bold text-blue-600">{events.length}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <h4 className="font-medium text-green-800">Average Attendance Rate</h4>
          <p className="text-2xl font-bold text-green-600">
            {Math.round(
              (events.reduce((acc, event) => 
                acc + (event.attendees.filter(a => a.status === 'confirmed').length / event.attendees.length), 0
              ) / events.length) * 100
            )}%
          </p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <h4 className="font-medium text-purple-800">Total Participants</h4>
          <p className="text-2xl font-bold text-purple-600">
            {events.reduce((acc, event) => acc + event.attendees.length, 0)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default EventAnalytics;