// App.jsx
// IT5007 Assignment-1: TicketMaster

/* =========================================
   Q1: ATTENDEE DATA VARIABLE & SEAT CONFIG
========================================= */
// Seat configuration: seats 1-8 = Gold (with dinner), seats 9-10 = Silver
const GOLD_SEATS = [1, 2, 3, 4, 5, 6, 7, 8];
const SILVER_SEATS = [9, 10];
const TOTAL_SEATS = 10;

// Initial sample attendees (stored in JS variable, no database)
const initialAttendees = [
  { id: 1, name: 'Alice Johnson', phone: '91234567', seatNumber: 1, ticketCategory: 'Gold' },
  { id: 2, name: 'Bob Smith', phone: '98765432', seatNumber: 9, ticketCategory: 'Silver' },
];


/* =========================================
   MAIN APP COMPONENT
========================================= */
class App extends React.Component {
  constructor() {
    super();
    this.state = {
      attendees: initialAttendees,
      activeView: 'display',
      nextId: 3,
    };
    this.setView = this.setView.bind(this);
    this.addAttendee = this.addAttendee.bind(this);
    this.deleteAttendee = this.deleteAttendee.bind(this);
  }

  setView(view) {
    this.setState({ activeView: view });
  }

  addAttendee(attendee) {
    this.setState(prevState => ({
      attendees: [...prevState.attendees, { ...attendee, id: prevState.nextId }],
      nextId: prevState.nextId + 1,
    }));
  }

  deleteAttendee(id) {
    this.setState(prevState => ({
      attendees: prevState.attendees.filter(a => a.id !== id),
    }));
  }

  render() {
    const { attendees, activeView } = this.state;
    return (
      <div>
        <h1>TicketMaster Reservation System</h1>
        <NavBar activeView={activeView} setView={this.setView} />
        <AvailableTickets attendees={attendees} />
        {activeView === 'display' && <DisplayAttendees attendees={attendees} onDelete={this.deleteAttendee} />}
        {activeView === 'add' && <AddAttendee attendees={attendees} onAdd={this.addAttendee} />}
        {activeView === 'delete' && <DeleteAttendee attendees={attendees} onDelete={this.deleteAttendee} />}
        {activeView === 'seatmap' && <SeatMap attendees={attendees} />}
      </div>
    );
  }
}

/* =========================================
   AVAILABLE TICKETS COMPONENT (Q2)
========================================= */
class AvailableTickets extends React.Component {
  render() {
    const { attendees } = this.props;
    const goldUsed = attendees.filter(a => a.ticketCategory === 'Gold').length;
    const silverUsed = attendees.filter(a => a.ticketCategory === 'Silver').length;
    return (
      <div style={{ padding: '8px', background: '#e8f5e9', marginBottom: '16px', textAlign: 'center' }}>
        <b>Tickets Available: {TOTAL_SEATS - attendees.length} / {TOTAL_SEATS}</b>
        {' | Gold: '}{GOLD_SEATS.length - goldUsed}
        {' | Silver: '}{SILVER_SEATS.length - silverUsed}
      </div>
    );
  }
}

/* =========================================
   NAVIGATION BAR COMPONENT (Q2)
========================================= */
class NavBar extends React.Component {
  render() {
    const { activeView, setView } = this.props;
    const views = [
      { key: 'display', label: 'Display Attendees' },
      { key: 'add', label: 'Add Attendee' },
      { key: 'delete', label: 'Delete Attendee' },
      { key: 'seatmap', label: 'Seat Map' },
    ];
    return (
      <div style={{ marginBottom: '16px' }}>
        {views.map(v => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            style={{
              marginRight: '8px',
              padding: '8px 16px',
              fontWeight: activeView === v.key ? 'bold' : 'normal',
              background: activeView === v.key ? '#1976d2' : '#e0e0e0',
              color: activeView === v.key ? '#fff' : '#333',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {v.label}
          </button>
        ))}
      </div>
    );
  }
}

/* =========================================
   DISPLAY ATTENDEES COMPONENT (Q3)
========================================= */
class DisplayAttendees extends React.Component {
  render() {
    const { attendees, onDelete } = this.props;
    if (attendees.length === 0) {
      return (
        <div>
          <h2>Attendee List</h2>
          <p>No attendees yet.</p>
        </div>
      );
    }
    const sorted = attendees.slice().sort((a, b) => a.seatNumber - b.seatNumber);
    return (
      <div>
        <h2>Attendee List</h2>
        <table className="bordered-table">
          <thead>
            <tr>
              <th>Seat #</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Ticket Category</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(a => (
              <tr key={a.id}>
                <td>{a.seatNumber}</td>
                <td>{a.name}</td>
                <td>{a.phone}</td>
                <td>{a.ticketCategory}</td>
                <td>
                  <button onClick={() => onDelete(a.id)}
                    style={{ background: '#dc3545', color: '#fff', border: 'none', padding: '4px 10px', cursor: 'pointer' }}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
}

/* =========================================
   ADD ATTENDEE COMPONENT (Q4)
========================================= */
class AddAttendee extends React.Component {
  constructor(props) {
    super(props);
    this.state = { name: '', phone: '', category: 'Gold', message: '' };
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleSubmit(e) {
    e.preventDefault();
    const { name, phone, category } = this.state;
    const { attendees, onAdd } = this.props;

    // Validation
    if (!name.trim() || !phone.trim()) {
      this.setState({ message: 'Error: Name and Phone are required.' });
      return;
    }
    if (attendees.some(a => a.phone === phone.trim())) {
      this.setState({ message: 'Error: Phone number already registered.' });
      return;
    }
    if (attendees.length >= TOTAL_SEATS) {
      this.setState({ message: 'Error: All seats are fully booked.' });
      return;
    }

    // Find lowest available seat in chosen category
    const categorySeats = category === 'Gold' ? GOLD_SEATS : SILVER_SEATS;
    const occupied = new Set(attendees.map(a => a.seatNumber));
    const available = categorySeats.filter(s => !occupied.has(s));
    if (available.length === 0) {
      this.setState({ message: 'Error: No ' + category + ' seats available.' });
      return;
    }

    const seat = available[0];
    onAdd({ name: name.trim(), phone: phone.trim(), seatNumber: seat, ticketCategory: category });
    this.setState({ name: '', phone: '', category: 'Gold', message: 'Booked seat ' + seat + ' (' + category + ') for ' + name.trim() + '.' });
  }

  render() {
    const { name, phone, category, message } = this.state;
    const msgStyle = message.startsWith('Error')
      ? { color: '#b71c1c', background: '#fdecea', padding: '8px', marginBottom: '8px' }
      : { color: '#2e7d32', background: '#e8f5e9', padding: '8px', marginBottom: '8px' };
    return (
      <div>
        <h2>Add Attendee Reservation</h2>
        {message && <div style={msgStyle}>{message}</div>}
        <form onSubmit={this.handleSubmit}>
          <div style={{ marginBottom: '8px' }}>
            <label>Name: </label>
            <input value={name} onChange={e => this.setState({ name: e.target.value })} />
          </div>
          <div style={{ marginBottom: '8px' }}>
            <label>Phone: </label>
            <input value={phone} onChange={e => this.setState({ phone: e.target.value })} />
          </div>
          <div style={{ marginBottom: '8px' }}>
            <label>Category: </label>
            <select value={category} onChange={e => this.setState({ category: e.target.value })}>
              <option value="Gold">Gold (with dinner)</option>
              <option value="Silver">Silver</option>
            </select>
          </div>
          <button type="submit" style={{ padding: '8px 16px', cursor: 'pointer' }}>Book Ticket</button>
        </form>
      </div>
    );
  }
}

/* =========================================
   DELETE ATTENDEE COMPONENT (Q5)
========================================= */
class DeleteAttendee extends React.Component {
  render() {
    return (
      <div>
        <h2>Cancel Reservation</h2>

        {/* TODO: Create a form to delete an attendee */}

        {/* Options:
            - Delete by Seat Number
            - Delete by Name/Phone
        */}

        {/* TODO: On Submit → Remove attendee from reservation list */}
      </div>
    );
  }
}

/* =========================================
   SEAT MAP VISUALIZATION (Q6)
========================================= */
class SeatMap extends React.Component {
  render() {
    return (
      <div>
        <h2>Seat Map</h2>

        {/* TODO: Display 10 seats visually */}

        {/* Rules:
            - Empty seats → Green
            - Reserved Gold seats → Gold
            - Reserved Silver seats → Silver
            - Seats must show seat number (1–10)
        */}
      </div>
    );
  }
}

ReactDOM.render(
  <App />,
  document.getElementById("contents")
);
