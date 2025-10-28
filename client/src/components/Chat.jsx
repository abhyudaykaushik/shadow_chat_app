import React, { useEffect, useState } from "react";
import io from "socket.io-client";

const socket = io("https://chat-server-abhyuday.onrender.com", {
  autoConnect: false
});

export default function Chat({ user, onLogout, onProfileUpdate }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [chatState, setChatState] = useState('idle');
  const [onlineCount, setOnlineCount] = useState(0);
  const [partnerUsername, setPartnerUsername] = useState('Stranger');
  
  const [preference, setPreference] = useState('any');
  const [isEditingGender, setIsEditingGender] = useState(false);
  const [editableGender, setEditableGender] = useState(user.gender);

  useEffect(() => {
    socket.connect();
    socket.emit("userOnline", user.google_uid);

    socket.on('onlineUsersCount', setOnlineCount);
    
    socket.on("matchFound", (data) => {
      setPartnerUsername(data.partnerUsername);
      setMessages([{ text: `You are now chatting with ${data.partnerUsername}.`, type: "system" }]);
      setChatState('chatting');
    });

    socket.on("receiveMessage", (data) => {
      setMessages((prev) => [...prev, { text: data.message, type: "other" }]);
    });
    
    socket.on("chatEnded", () => {
      setMessages((prev) => [...prev.filter(m => m.type !== 'system'), { text: "Chat has ended. You can start a new one.", type: "system" }]);
      setChatState('stopped');
      setPartnerUsername('Stranger');
    });

    return () => {
      socket.off('onlineUsersCount');
      socket.off("matchFound");
      socket.off("receiveMessage");
      socket.off("chatEnded");
      socket.disconnect();
    };
  }, [user]);

  const handleUpdateGender = async () => {
    if (editableGender === user.gender) { setIsEditingGender(false); return; }
    try {
      const response = await fetch("https://chat-server-abhyuday.onrender.com/auth/edit-gender", {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newGender: editableGender, uid: user.google_uid }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      onProfileUpdate(data.user);
      setIsEditingGender(false);
    } catch (err) { alert(err.message); }
  };

  const findNewMatch = () => {
    if (!socket.connected) { 
      socket.connect(); 
      socket.emit("userOnline", user.google_uid); 
    }
    setMessages([{ text: "Searching for a partner...", type: "system" }]);
    setChatState('searching');
    socket.emit("findMatch", { userId: user.google_uid, gender: user.gender, preference });
  };

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { text: input, type: "user" }]);
    socket.emit("sendMessage", { message: input });
    setInput("");
  };
  
  const handleStop = () => socket.emit("stopChat");

  const handleNext = () => {
      setMessages([{ text: "Finding next partner...", type: "system" }]);
      setChatState('searching');
      socket.emit("requestNextPartner", { userId: user.google_uid, gender: user.gender, preference });
  }

  return (
    <div className="chat-container">
      <div className="chat-header"><h3>{chatState === 'chatting' ? `Chatting with ${partnerUsername}` : "Welcome, " + user.username}</h3></div>
      <div className="online-indicator"><span className="green-dot"></span>{onlineCount} Online</div>
      <button onClick={onLogout} className="logout-button">Logout</button>
      
      <div className="messages">
        {messages.map((msg, i) => (<div key={i} className={`message ${msg.type}`}>{msg.text}</div>))}
      </div>

      {(chatState === 'idle' || chatState === 'stopped') && (
        <div className="match-settings">
          <div className="setting-row">
            <label>Your Gender:</label>
            {!isEditingGender ? (
              <>
                <span style={{textTransform: 'capitalize'}}>{user.gender}</span>
                <button onClick={() => setIsEditingGender(true)}>Change</button>
              </>
            ) : (
              <div className="inline-edit">
                <select value={editableGender} onChange={e => setEditableGender(e.target.value)}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                <button onClick={handleUpdateGender}>Save</button>
              </div>
            )}
          </div>
          <div className="setting-row">
            <label>Chat with:</label>
            <select value={preference} onChange={e => setPreference(e.target.value)}>
              <option value="any">Any Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
        </div>
      )}

      {chatState === 'chatting' && (
        <div className="input-area">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder="Type a message..." />
          <button onClick={sendMessage}>Send</button>
        </div>
      )}

      <div className="actions">
        {chatState === 'chatting' ? (
          <><button className="stop" onClick={handleStop}>Stop</button><button className="next" onClick={handleNext}>Next</button></>
        ) : (
          <button className="new-match" onClick={findNewMatch} disabled={chatState === 'searching'}>
            {chatState === 'searching' ? 'Searching...' : 'Start New Match'}
          </button>
        )}
      </div>
    </div>
  );
}