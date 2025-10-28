import React from "react";

export default function Sidebar({ visible }) {
  if (!visible) return null;
  return (
    <div className="sidebar">
      <h3>Filters</h3>
      <button>Match with Girls</button>
      <button>Match with Boys</button>
      <button>Profile</button>
      <button>Settings</button>
      <button>Premium</button>
    </div>
  );
}
