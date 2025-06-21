"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client'; // Removed DisconnectReason

interface Document {
  _id: string;
  title: string;
  content: string;
  projectId: string;
}

interface DocumentEditorProps {
  documentId: string | null;
  projectId: string | null; // Needed to join the correct socket room
}

// Debounce function - Moved outside the component
// More specific typing for debounce
const debounce = <TArgs extends unknown[]>(
  func: (...args: TArgs) => unknown,
  waitFor: number
) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: TArgs): void => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };
};

const DocumentEditor: React.FC<DocumentEditorProps> = ({ documentId, projectId }) => {
  const [document, setDocument] = useState<Document | null>(null);
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Using useRef to manage socket instance to avoid triggering useEffect on every socket state change
  const socketRef = useRef<Socket | undefined | null>(null);

  // Initialize socket connection
  useEffect(() => {
    if (!projectId) return;

    // Assuming collaboration service is on the same host or proxied.
    // For direct connection: process.env.NEXT_PUBLIC_COLLABORATION_SERVICE_URL (without /api part for socket)
    // e.g. http://localhost:3001
    // If your socket server is at the root of the collaboration service URL:
    if (!documentId || !projectId) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null; // Set ref to null on intentional disconnect
      }
      return;
    }

    // Placeholder for getting user token - replace with actual Firebase auth
    const getCurrentUserIdToken = async (): Promise<string | null> => {
      console.warn("DocumentEditor: Using placeholder ID token for socket connection.");
      // In a real app, this would come from Firebase Auth:
      // firebase.auth().currentUser?.getIdToken();
      return "dummy-socket-token";
    };

    let newSocket: Socket | undefined; // Use undefined initially

    const connectSocket = async () => {
      const token = await getCurrentUserIdToken();
      if (!token) {
        console.error("DocumentEditor: No token available for socket connection.");
        setError("Authentication token not available for real-time connection.");
        return;
      }

      // Connect to the current origin (window.location.origin), assuming Next.js dev server proxies /socket.io/
      // The server (collaboration-service) listens on its default /socket.io/ path.
      // Specify the type explicitly for better type safety
      newSocket = io(window.location.origin, { // undefined connects to window.location.origin
        path: '/socket.io/',      // Standard Socket.IO path
        reconnectionAttempts: 3,
        timeout: 10000,
        query: { token, projectId } // Send token and project ID for authentication and room joining
      });

      newSocket.on('connect', () => {
        console.log('DocumentEditor: Socket connected successfully', newSocket?.id);
        socketRef.current = newSocket; // Update ref on successful connection
        newSocket?.emit('joinProject', projectId); // Join a room associated with the project
      });

      // Explicitly type the error object from socket.io-client
      newSocket.on('connect_error', (err: Error) => {
        console.error('DocumentEditor: Socket connection error:', err);
        setError(`Failed to connect to real-time service: ${err.message}`);
        // Attempt to clean up the socket if it's in a bad state but not null
        if (newSocket && !newSocket.connected) {
            newSocket.disconnect();
        }
        socketRef.current = null; // Clear socket ref on connection error
      });

      // Explicitly type the reason parameter from socket.io-client
      newSocket.on('disconnect', (reason: string) => { // Changed DisconnectReason to string
        console.log('DocumentEditor: Socket disconnected:', reason);
        // Only set error if not an intentional disconnect (handled by cleanup)
        if (reason !== 'io client disconnect') {
          // setError('Disconnected from real-time service.');
        }
         socketRef.current = null; // Clear socket ref on disconnect
      });

      // Explicitly type the updatedDocument object
      newSocket.on('documentUpdated', (updatedDocument: { documentId: string; content: string; updatedBy: string }) => {
        // Check if the update is for the current document and not from the current socket
        if (updatedDocument.documentId === documentId && updatedDocument.updatedBy !== socketRef.current?.id) {
          setContent(updatedDocument.content);
        }
      });

      // Handle joinedProject confirmation (optional, for logging or UI feedback)
      newSocket.on('joinedProject', (joinedProjectId: string) => {
        if (joinedProjectId === projectId) {
          console.log(`DocumentEditor: Successfully joined project room ${projectId}`);
        }
      });
    }

    connectSocket();

    // Store the new socket in ref
    // socketRef.current is updated in the 'connect' handler

    return () => {
      if (newSocket) {
        console.log(`DocumentEditor: Cleaning up socket for project ${projectId}, document ${documentId}`);
        newSocket.emit('leaveProject', projectId);
        newSocket.disconnect();
      }
    }; // No dependency on `socket` state, use `socketRef.current`
  }, [documentId, projectId]); // Depend only on documentId and projectId


  // Fetch document content
  useEffect(() => {
    if (!documentId) {
      setDocument(null);
      setContent('');
      return;
    }

    const fetchDocument = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const baseUrl = process.env.NEXT_PUBLIC_COLLABORATION_API_BASE_URL || '/api/collaboration';
        const response = await fetch(`${baseUrl}/documents/${documentId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch document: ${response.statusText}`);
        }
        const data: Document = await response.json();
        setDocument(data);
        setContent(data.content || ''); // Ensure content is string
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        console.error("Error fetching document:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocument();
  }, [documentId]);

  // Debounced function to emit document changes
  const debouncedEmitChange = useMemo(() =>
    debounce((newContent: string) => {
      if (socketRef.current && documentId && projectId) {
        socketRef.current.emit('documentChange', {
          documentId,
          projectId,
          newContent,
        });
      }
    }, 500),
    // socketRef.current is stable, documentId and projectId are dependencies
    // because the debounced function closes over them.
    [documentId, projectId]
  );
  const handleContentChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = event.target.value;
    setContent(newText);
    debouncedEmitChange(newText);
  };

  if (!documentId) {
    return <div className="p-6 text-center text-gray-500">Select a document to start editing.</div>;
  }

  if (isLoading) {
    return <div className="p-6"><p>Loading document...</p></div>;
  }

  if (error) {
    return <div className="p-6 text-red-500"><p>Error: {error}</p></div>;
  }

  if (!document) {
    return <div className="p-6 text-center text-gray-500">Document not found.</div>;
  }

  return (
    <div className="p-6 bg-white shadow-lg rounded-lg h-full flex flex-col">
      <h2 className="text-2xl font-semibold mb-4 text-gray-800">{document.title}</h2>
      <textarea
        value={content}
        onChange={handleContentChange}
        className="flex-grow p-4 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
        placeholder="Start typing your document content here..."
      />
      <div className="mt-4 text-sm text-gray-500">
        <p>Project ID: {projectId}</p>
        <p>Document ID: {documentId}</p>
        {socketRef.current?.connected ? <p className="text-green-500">Connected (Socket ID: {socketRef.current.id})</p> : <p className="text-red-500">Disconnected</p>}
      </div>
    </div>
  );
};

export default DocumentEditor;
