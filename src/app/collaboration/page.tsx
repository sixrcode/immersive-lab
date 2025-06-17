"use client";

import React, { useState, useEffect } from 'react';
import ProjectList from '@/components/collaboration/ProjectList';
import DocumentEditor from '@/components/collaboration/DocumentEditor';
import ChatWindow from '@/components/collaboration/ChatWindow';
// A new component to list documents for a selected project
import DocumentList from '@/components/collaboration/DocumentList';


// Mock current user (replace with actual authentication context)
const MOCK_USER = {
  id: 'user_123abc', // Example user ID
  name: 'Dev User',   // Example user display name
};

export default function CollaborationPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  // Effect to clear document selection when project changes
  useEffect(() => {
    setSelectedDocumentId(null); // Clear document when project changes
  }, [selectedProjectId]);

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-var(--header-height,4rem))] bg-gray-900 text-white">
      {/* Left Sidebar: Project List */}
      <aside className="w-full md:w-1/4 xl:w-1/5 p-4 bg-gray-850 overflow-y-auto shadow-lg">
        <ProjectList
          onSelectProject={setSelectedProjectId}
          selectedProjectId={selectedProjectId}
        />
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col md:flex-row p-1 md:p-4 gap-1 md:gap-4 overflow-hidden">
        {/* Document Area: List and Editor */}
        <div className="w-full md:w-2/3 flex flex-col gap-1 md:gap-4">
          {selectedProjectId && (
            <div className="bg-gray-800 p-1 md:p-4 rounded-lg shadow-md h-1/3 md:h-auto md:min-h-[200px] overflow-y-auto">
              <DocumentList
                projectId={selectedProjectId}
                onSelectDocument={setSelectedDocumentId}
                selectedDocumentId={selectedDocumentId}
              />
            </div>
          )}
          <div className="flex-grow bg-gray-800 rounded-lg shadow-md overflow-hidden">
            {selectedProjectId && selectedDocumentId ? (
              <DocumentEditor documentId={selectedDocumentId} projectId={selectedProjectId} />
            ) : (
              <div className="p-6 text-center text-gray-400 h-full flex items-center justify-center">
                {selectedProjectId ? "Select a document to start editing." : "Select a project to see documents and chat."}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Chat Window */}
        <aside className="w-full md:w-1/3 p-1 md:p-0 h-1/2 md:h-full">
          {selectedProjectId ? (
            <ChatWindow
              projectId={selectedProjectId}
              currentUserId={MOCK_USER.id}
              currentUserName={MOCK_USER.name}
            />
          ) : (
            <div className="p-6 text-center text-gray-400 bg-gray-800 rounded-lg shadow-md h-full flex items-center justify-center">
              Select a project to enable chat.
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
