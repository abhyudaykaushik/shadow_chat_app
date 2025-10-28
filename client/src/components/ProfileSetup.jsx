import React, { useState } from 'react';

export default function ProfileSetup({ user, onSetupComplete }) {
  const [username, setUsername] = useState('');
  const [gender, setGender] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !gender) {
      setError('Please enter a username and select a gender.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch("http://localhost:4000/auth/update-profile", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, gender, uid: user.google_uid }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      onSetupComplete(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-box" onSubmit={handleSubmit}>
        <h2>Create Your Profile</h2>
        <p>This is a one-time setup.</p>
        <input type="text" placeholder="Enter a unique username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        <select value={gender} onChange={(e) => setGender(e.target.value)} required style={{ color: gender ? '#E0E0E0' : '#A0A0A0' }}>
          <option value="">Select Gender...</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
        {error && <p style={{ color: '#F25C54', textAlign: 'center' }}>{error}</p>}
        <button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Start Chatting'}</button>
      </form>
    </div>
  );
}