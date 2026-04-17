# Campus Navigation System

## Project Overview

This project is a Campus Navigation System that provides backend APIs along with a basic frontend interface to manage and explore campus locations. It allows users to store, retrieve, and search location data efficiently within a campus environment.

## Features

* Manage campus locations (add, view, search)
* User-related API handling
* Structured backend using routes and models
* Simple frontend interface for interaction

## Technologies Used

* Node.js
* Express.js
* MongoDB
* HTML, CSS, JavaScript

## ## Project Structure

```
CAMPUS NAVIGATION BACKEND/
│
├── frontend/
│   ├── index.html
│   ├── map.html
│   ├── script.js
│   └── style.css
│
├── models/
│   ├── Location.js
│   └── User.js
│
├── routes/
│   ├── locationRoutes.js
│   └── userRoutes.js
│
├── data/
│   └── locations.json
│
├── app.js
├── package.json
├── .gitignore
└── README.md
```


## Prerequisites

Make sure the following are installed on your system:

* Node.js (version 14 or above recommended)
* MongoDB (running locally on port 27017)

## Installation

1. Clone the repository:

git clone https://github.com/Dij06/MinorProject_CampusNavigation_DivyanshiJadon.git

2. Navigate to the project directory:

cd MinorProject_CampusNavigation_DivyanshiJadon

3. Install dependencies:

npm install

The required packages include:

* express
* mongoose
* cors

## Configuration

The application connects to MongoDB using the following URL:

mongodb://127.0.0.1:27017/campus_navigation

Ensure MongoDB is running locally before starting the server.

## Running the Application

Start the backend server:

node app.js

The server runs on:

http://localhost:7000


### Testing the Backend

To verify that the backend is working, open:

http://localhost:7000/hello

You should see a confirmation message from the server.

### Running the Frontend

Open the frontend using Live Server or open the file directly:

frontend/index.html

## API Endpoints

* GET /hello
  Test route to check if the server is running

* /api/locations
  Handles location-related operations

* /api/search
  Provides search functionality for locations

* /api/users
  Handles user-related operations

## Database Setup

Sample data is provided in:

data/locations.json

To import the data into MongoDB:

mongoimport --uri="mongodb://127.0.0.1:27017/campus_navigation" --collection=locations --file=data/locations.json --jsonArray

## Important Notes

* The `.env` file is not included for security reasons
* `node_modules` is excluded from the repository
* Ensure MongoDB service is running before starting the application

## Authors

* Akansha Tomar 
* Divyanshi Jadon 
* Kashak Gupta
* Laxmi Ojha
