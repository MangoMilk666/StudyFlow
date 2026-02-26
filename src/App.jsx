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
  render() {
    return (
      <div>
        <h1>TicketMaster Reservation System</h1>

        {/* TODO (Q2): Add Navigation Bar Component */}
        <NavBar />

        {/* TODO (Q2): Show ONE component at a time based on navigation */}

        {/* TODO (Q3): Display Attendee Table */}
        {/* <DisplayAttendees /> */}

        {/* TODO (Q4): Add Attendee Form */}
        {/* <AddAttendee /> */}

        {/* TODO (Q5): Delete Attendee Form */}
        {/* <DeleteAttendee /> */}

        {/* TODO (Q6): Seat Map Visualization */}
        {/* <SeatMap /> */}
      </div>
    );
  }
}

/* =========================================
   NAVIGATION BAR COMPONENT (Q2)
========================================= */
class NavBar extends React.Component {
  render() {
    return (
      <div>
        <h2>Navigation</h2>

        {/* TODO: Add buttons for switching views */}
        {/* Example:
            Home | Display Attendees | Add Attendee | Delete Attendee | Seat Map
        */}
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
