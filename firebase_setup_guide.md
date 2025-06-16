# Firebase Setup Guide

This guide will walk you through setting up a Firebase project for Cloud Functions.

## 1. Install Firebase CLI

If you haven't already, install the Firebase CLI globally using npm. You might need to use `sudo` depending on your npm configuration:

```bash
sudo npm install -g firebase-tools
```

## 2. Log in to Firebase

After installing the CLI, you need to log in to your Firebase account. Run the following command in your terminal and follow the prompts. This will open a browser window for authentication.

```bash
firebase login
```

**Note:** This command needs to be run in your local environment, not in a restricted sandbox.

## 3. Create or Select a Firebase Project

There are two ways to set up your Firebase project:

### Option A: Create a new project via Firebase Console

1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Click on "Add project" (or "Create a project").
3.  Follow the on-screen instructions to name your project, configure Google Analytics (optional), and create the project.
4.  Once your project is created, you don't need to do anything further in the console for now. The CLI will help you link this project.

### Option B: Use an existing project

If you already have a Firebase project you want to use, make sure you know its Project ID. You can find this in the Firebase Console by selecting your project and going to "Project settings".

### Linking your project with the CLI

After creating or identifying your project, you'll use the `firebase init` command in the next step, which will allow you to select or create a project. If you've created a project through the console, you can select it from a list during the `firebase init` process. You can also use `firebase use --add` and select your project from the list to explicitly link it.

## 4. Initialize Firebase SDK for Cloud Functions

Navigate to your local project directory where you want to set up Firebase Functions.

```bash
cd path/to/your/project
```

Then, run the initialization command:

```bash
firebase init functions
```

During the initialization process:

1.  **Project Setup**:
    *   It will ask you to choose a Firebase project. You can either "Use an existing project" (if you created one in the console or have one already) or "Create a new project" directly from the CLI (though creating via the console is often easier for first-timers).
    *   If you choose "Use an existing project", select your desired project from the list.
2.  **Language**:
    *   When prompted for the language for your Cloud Functions, select **JavaScript**.
3.  **ESLint**:
    *   You might be asked if you want to use ESLint to catch probable bugs and enforce style. Choose Yes (Y) or No (n) based on your preference. (Choosing Yes is generally recommended).
4.  **Install dependencies**:
    *   It will ask if you want to install dependencies with npm now. Choose Yes (Y).

This process will create a few files and folders in your project directory:

*   `functions/`: This is the most important directory. All your Cloud Functions code will reside here.
    *   `index.js`: This is the main file where you'll write your JavaScript Cloud Functions.
    *   `package.json`: Standard Node.js package file for managing your functions' dependencies (like Express.js, which we'll add next).
    *   `.eslintrc.js` (if you chose to use ESLint): Configuration file for ESLint.
    *   `node_modules/`: Contains all the installed Node.js packages for your functions.
*   `firebase.json`: This is the Firebase project configuration file. It tells the Firebase CLI which services are initialized in your local directory (e.g., Functions, Hosting, Firestore). For functions, it will specify the source directory (usually "functions").
*   `.firebaserc`: This file stores project aliases. It maps an alias (like "default") to your Firebase Project ID, so you don't have to specify the project ID with every command.

## 5. Install Express.js (Optional, but common)

Express.js is a popular framework for building web applications and APIs with Node.js. It's very useful for routing and handling HTTP requests in your Cloud Functions, especially if you plan to create multiple API endpoints.

To add Express.js to your Cloud Functions:

1.  Navigate into the `functions` directory that was created:
    ```bash
    cd functions
    ```
2.  Install Express using npm:
    ```bash
    npm install express
    ```
    This will add `express` to the `dependencies` section in your `functions/package.json` file.

You are now ready to start writing your Cloud Functions in `functions/index.js`!
For example, to create a simple HTTP endpoint with Express:

```javascript
// functions/index.js
const functions = require("firebase-functions");
const express = require("express");

const app = express();

app.get("/hello", (req, res) => {
  res.send("Hello from Firebase with Express!");
});

// Expose Express API as a single Cloud Function:
exports.api = functions.https.onRequest(app);

// To deploy this function, run: firebase deploy --only functions
```

This completes the initial setup.
```
