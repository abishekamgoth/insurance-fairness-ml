import { NavLink } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <div className="navbar-inner">
        <NavLink to="/" className="navbar-logo">
          MedInsure Analytics
        </NavLink>
        <ul className="navbar-links">
          <li>
            <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
              Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink to="/predict" className={({ isActive }) => isActive ? 'active' : ''}>
              Predict
            </NavLink>
          </li>
          <li>
            <NavLink to="/evaluation" className={({ isActive }) => isActive ? 'active' : ''}>
              Evaluation
            </NavLink>
          </li>
          <li>
            <NavLink to="/explain" className={({ isActive }) => isActive ? 'active' : ''}>
              Explainability
            </NavLink>
          </li>
          <li>
            <NavLink to="/fairness" className={({ isActive }) => isActive ? 'active' : ''}>
              Fairness
            </NavLink>
          </li>
        </ul>
      </div>
    </nav>
  );
}
