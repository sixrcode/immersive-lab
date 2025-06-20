# Data Consistency Strategy and Source of Truth

This document outlines the strategy for maintaining data consistency for project-related information across different microservices and databases within the Immersive Lab platform.

## 1. Source of Truth for Project Metadata

The **`collaboration-service` (MongoDB)** is designated as the **source of truth** for core project metadata. This includes, but is not limited to:

*   Project ID (unique identifier)
*   Project Name
*   Project Description
*   Project Members
*   Creation and Update Timestamps

Any changes to these core project attributes must originate from or be processed by the `collaboration-service`.

## 2. Data Replication and Synchronization

Other services, particularly those using Firestore (e.g., for storyboards, prototypes), may store a subset of project information for linking or display purposes. This data is considered a **replica** and should be kept synchronized with the source of truth in MongoDB.

### Synchronization Mechanism:

*   **Event-Driven Updates:** Changes to project metadata in the `collaboration-service` (e.g., project creation, deletion, renaming) trigger events.
*   **`firestoreSyncService`:** A dedicated service (`firestoreSyncService`) within the `collaboration-service` listens to these project-related events.
*   **Firestore Updates:** This service is responsible for propagating the necessary changes to Firestore documents.
    *   **Project Deletion:** When a project is deleted from MongoDB, the `firestoreSyncService` will delete all associated data in Firestore (e.g., storyboards, prototypes linked to that `projectId`).
    *   **Project Renaming:** When a project's name is updated in MongoDB, the `firestoreSyncService` will update the `projectName` (or equivalent field) in all associated Firestore documents.

## 3. Rationale

*   **Centralized Management:** Having a single source of truth simplifies project data management and reduces the risk of conflicting information.
*   **Clear Ownership:** The `collaboration-service` has clear ownership of project lifecycle management.
*   **Decoupling:** The event-driven approach decouples the `collaboration-service` from the specifics of how other services store their related data, as long as the synchronization service can handle the updates.

## 4. Future Considerations

*   **Data Reconciliation:** Mechanisms for periodic data reconciliation could be considered to catch any inconsistencies that might arise due to event processing failures, although the aim is for the event-driven system to be robust.
*   **Distributed Transactions:** For more complex scenarios requiring stronger consistency guarantees across services, distributed transaction patterns (e.g., Sagas) could be evaluated, but for the current scope, an event-driven eventual consistency model is deemed appropriate.
