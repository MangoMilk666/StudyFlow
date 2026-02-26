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
    return (
      <div>
        <h2>Attendee List</h2>

        {/* TODO: Fetch attendee data from App.jsx variable/state */}

        {/* TODO: Display attendees in a table format */}

        {/* Table Columns should include:
            Seat Number | Name | Phone | Ticket Category
        */}
      </div>
    );
  }
}

/* =========================================
   ADD ATTENDEE COMPONENT (Q4)
========================================= */
class AddAttendee extends React.Component {
  render() {
    return (
      <div>
        <h2>Add Attendee Reservation</h2>

        {/* TODO: Create a form with fields:
            Name, Phone, Ticket Category (Gold/Silver)
        */}

        {/* TODO: On Submit → Add attendee into reservation list */}

        {/* TODO: Allocate seat number (1–10) */}
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
