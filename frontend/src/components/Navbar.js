import './Navbar.css'; // Optional separate CSS for Navbar or import index.css globally

export default function Navbar({ user, onLogout, onLoginClick, onSignupClick }) {
  return (
    <nav className="navbar container">
      <div className="navbar-logo">AGRINOVA</div>
      <div className="navbar-links">
        {!user ? (
          <>
            <button className="navbar-link" onClick={onLoginClick}>
              Login
            </button>
            <button className="navbar-link" onClick={onSignupClick}>
              Sign Up
            </button>
          </>
        ) : (
          <>
            <span className="navbar-link">Hello, {user.username}</span>
            <button className="navbar-link" onClick={onLogout}>
              Log Out
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
