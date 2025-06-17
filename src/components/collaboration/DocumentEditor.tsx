"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

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

const DocumentEditor: React.FC<DocumentEditorProps> = ({ documentId, projectId }) => {
  const [document, setDocument] = useState<Document | null>(null);
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Debounce function
  const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<F>): Promise<ReturnType<F>> =>
      new Promise(resolve => {
        if (timeout) {
          clearTimeout(timeout);
        }
        timeout = setTimeout(() => resolve(func(...args)), waitFor);
      });
  };

  // Initialize socket connection
  useEffect(() => {
    if (!projectId) return;

    // Assuming collaboration service is on the same host or proxied.
    // For direct connection: process.env.NEXT_PUBLIC_COLLABORATION_SERVICE_URL (without /api part for socket)
    // e.g. http://localhost:3001
    // If your socket server is at the root of the collaboration service URL:
    const socketServiceUrl = (process.env.NEXT_PUBLIC_COLLABORATION_API_BASE_URL || '').startsWith('http')
      ? process.env.NEXT_PUBLIC_COLLABORATION_API_BASE_URL?.replace('/api', '') // if it's a full URL
      : window.location.origin; // if it's a path like /api/collaboration, use current origin

    const newSocket = io(socketServiceUrl, {
      path: (process.env.NEXT_PUBLIC_COLLABORATION_API_BASE_URL || '').startsWith('/api/collaboration')
        ? '/socket.io/' // Default path if proxied under root and server is also at root
        : `${process.env.NEXT_PUBLIC_COLLABORATION_API_BASE_URL?.replace('/api', '')}/socket.io/` // Adjust if service has specific path for socket.io
    });


    setSocket(newSocket);

    newSocket.emit('joinProject', projectId); // Join a room associated with the project

    newSocket.on('documentUpdated', (updatedDocument: { documentId: string; content: string; updatedBy: string }) => {
      if (updatedDocument.documentId === documentId && updatedDocument.updatedBy !== newSocket.id) {
        setContent(updatedDocument.content);
      }
    });

    return () => {
      newSocket.emit('leaveProject', projectId);
      newSocket.disconnect();
    };
  }, [documentId, projectId]);


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
        setContent(data.content);
      } catch (err: any) {
        setError(err.message || 'An unknown error occurred.');
        console.error("Error fetching document:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocument();
  }, [documentId]);

  // Debounced function to emit document changes
  const debouncedEmitChange = useCallback(
    debounce((newContent: string) => {
      if (socket && documentId && projectId) {
        socket.emit('documentChange', {
          documentId,
          projectId, // Send projectId for routing in the backend
          newContent,
        });
      }
    }, 500), // 500ms debounce time
    [socket, documentId, projectId]
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
        {socket?.connected ? <p className="text-green-500">Connected (Socket ID: {socket.id})</p> : <p className="text-red-500">Disconnected</p>}
      </div>
    </div>
  );
};

export default DocumentEditor;
