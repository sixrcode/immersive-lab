# Portfolio Microservice

This microservice manages portfolio items.

## Prerequisites

- Node.js (v14 or later recommended)
- npm
- MongoDB (local instance or a cloud-hosted solution like MongoDB Atlas)

## Setup

1.  **Clone the repository (or ensure you have this microservice's code).**

2.  **Navigate to the microservice directory:**
    ```bash
    cd portfolio-microservice
    ```

3.  **Install dependencies:**
    ```bash
    npm install
    ```

4.  **Set up environment variables:**
    Create a `.env` file in the `portfolio-microservice` directory by copying the example file:
    ```bash
    cp .env.example .env
    ```
    Open the `.env` file and replace `your_mongodb_connection_string_here` with your actual MongoDB connection string.

    **Example `MONGODB_URI` formats:**
    *   **MongoDB Atlas:** `mongodb+srv://<username>:<password>@<cluster-name>.mongodb.net/<database-name>?retryWrites=true&w=majority`
        *   Replace `<username>`, `<password>`, `<cluster-name>`, and `<database-name>` with your credentials and database details.
    *   **Local MongoDB instance:** `mongodb://localhost:27017/<database-name>`
        *   Replace `<database-name>` with the name of your local database.

5.  **Start the server:**
    ```bash
    npm start
    ```
    (Assuming you add a "start": "node src/index.js" script to your package.json)

    Alternatively, for development with automatic restarts, you can use `nodemon`:
    ```bash
    npx nodemon src/index.js
    ```

## API Endpoints

The service exposes the following CRUD endpoints for portfolio items under the `/portfolio` base path:

-   `POST /`: Create a new portfolio item.
-   `GET /`: Get all portfolio items.
-   `GET /:id`: Get a specific portfolio item by ID.
-   `PUT /:id`: Update a specific portfolio item by ID.
-   `DELETE /:id`: Delete a specific portfolio item by ID.

Refer to `routes/portfolio.js` for details on request body and response formats.
Refer to `models/PortfolioItem.js` for the data schema.

## Running the service

Once the setup is complete and MongoDB is accessible with the provided `MONGODB_URI`, the server will connect to the database upon starting.

If the `MONGODB_URI` is not set or the connection fails, the application will log an error and exit.
