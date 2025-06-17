"use client";

import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface ChatMessage {
  _id?: string; // Optional _id from backend
  id?: string; // client-side id
  senderId: string; // Could be user ID or socket ID for simplicity here
  senderName?: string; // Display name
  message: string;
  timestamp: string | Date;
  projectId: string;
}

interface ChatWindowProps {
  projectId: string | null;
  // Assume a simple way to get current user's ID or name
  currentUserId: string;
  currentUserName?: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ projectId, currentUserId, currentUserName = 'User' }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Socket connection
  useEffect(() => {
    if (!projectId) {
      if(socket) socket.disconnect();
      setSocket(null);
      return;
    }
    // Similar to DocumentEditor, adjust URL and path for socket.io
    const socketServiceUrl = (process.env.NEXT_PUBLIC_COLLABORATION_API_BASE_URL || '').startsWith('http')
      ? process.env.NEXT_PUBLIC_COLLABORATION_API_BASE_URL?.replace('/api', '')
      : window.location.origin;

    const newSocket = io(socketServiceUrl, {
       path: (process.env.NEXT_PUBLIC_COLLABORATION_API_BASE_URL || '').startsWith('/api/collaboration')
        ? '/socket.io/'
        : `${process.env.NEXT_PUBLIC_COLLABORATION_API_BASE_URL?.replace('/api', '')}/socket.io/`
    });

    setSocket(newSocket);

    newSocket.emit('joinProject', projectId);
    console.log(`Chat: Joined project room ${projectId}`);

    newSocket.on('newChatMessage', (chatMessage: ChatMessage) => {
      console.log('Chat: Received new message', chatMessage);
      // Ensure message is for the current project, though room subscription should handle this
      if (chatMessage.projectId === projectId) {
        setMessages((prevMessages) => [...prevMessages, chatMessage]);
      }
    });

    // Fetch initial chat messages
    const fetchMessages = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_COLLABORATION_API_BASE_URL || '/api/collaboration';
        // Ensure projectId is part of the path as expected by the chatMessages route
        const response = await fetch(`${baseUrl}/chats/projects/${projectId}/chats`);
        if (!response.ok) {
          throw new Error(`Failed to fetch chat messages: ${response.statusText}`);
        }
        const data = await response.json();
        setMessages(data.map((msg:any) => ({...msg, senderName: msg.senderId?.username || 'User'}))); // Adjust if sender info is populated
      } catch (err) {
        console.error("Error fetching chat messages:", err);
      }
    };

    fetchMessages();

    return () => {
      console.log(`Chat: Leaving project room ${projectId}`);
      newSocket.emit('leaveProject', projectId);
      newSocket.disconnect();
    };
  }, [projectId, socket]);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket || !projectId) return;

    const chatMessage: ChatMessage = {
      id: new Date().toISOString(), // Temporary client-side ID
      projectId,
      senderId: currentUserId,
      senderName: currentUserName,
      message: newMessage.trim(),
      timestamp: new Date().toISOString(),
    };

    // Optimistically update UI
    setMessages((prevMessages) => [...prevMessages, chatMessage]);

    try {
      // Send message via REST API - this allows saving to DB and then broadcasting via socket from server
      const baseUrl = process.env.NEXT_PUBLIC_COLLABORATION_API_BASE_URL || '/api/collaboration';
      const response = await fetch(`${baseUrl}/chats/projects/${projectId}/chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: chatMessage.message,
          senderId: chatMessage.senderId, // Server should get this from auth ideally
          // documentId: null, // If it's a project-level chat
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      // The server should broadcast this message via Socket.IO to other clients.
      // The 'newChatMessage' listener above will pick it up for other clients.
      // If the server's response for POST includes the final message (with _id from DB),
      // you could update the optimistically added message. For now, we assume the broadcast is sufficient.

    } catch (error) {
      console.error('Failed to send message:', error);
      // Revert optimistic update if needed or show error
      setMessages((prevMessages) => prevMessages.filter(msg => msg.id !== chatMessage.id));
      alert('Error sending message. Please try again.');
    }


    setNewMessage('');
  };

  if (!projectId) {
    return <div className="p-4 text-center text-gray-400">Select a project to see the chat.</div>;
  }

  return (
    <div className="flex flex-col h-full bg-gray-800 text-white shadow-lg rounded-lg p-4">
      <h2 className="text-xl font-semibold mb-3 border-b border-gray-700 pb-2">Project Chat</h2>
      {socket?.connected ? <p className="text-xs text-green-400 mb-2">Connected</p> : <p className="text-xs text-red-400 mb-2">Connecting chat...</p>}
      <div className="flex-grow overflow-y-auto mb-4 space-y-3 pr-2">
        {messages.map((msg, index) => (
          <div key={msg._id || msg.id || index} className={`flex ${msg.senderId === currentUserId ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-2.5 rounded-lg max-w-xs lg:max-w-md ${msg.senderId === currentUserId ? 'bg-blue-600' : 'bg-gray-700'}`}>
              <p className="text-xs text-gray-300 mb-0.5">{msg.senderName || msg.senderId}{msg.senderId === currentUserId ? ' (You)' : ''}</p>
              <p className="text-sm">{msg.message}</p>
              <p className="text-xs text-gray-400 mt-1 text-right">{new Date(msg.timestamp).toLocaleTimeString()}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSendMessage} className="flex">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-grow p-2 rounded-l-md bg-gray-700 border border-gray-600 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          placeholder="Type a message..."
        />
        <button type="submit" className="p-2 bg-blue-600 hover:bg-blue-700 rounded-r-md">
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;
