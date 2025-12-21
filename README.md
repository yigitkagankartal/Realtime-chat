# Vivoria - Advanced Real-Time Messaging Platform

![Status](https://img.shields.io/badge/Status-Live-success)
![Java](https://img.shields.io/badge/Java-17%2B-orange)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.x-green)
![React](https://img.shields.io/badge/React-18-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791)
![Cloudinary](https://img.shields.io/badge/Cloudinary-Media_API-blueviolet)

**Vivoria** is a full-stack, real-time messaging application built to provide a seamless communication experience similar to WhatsApp Web. It leverages **WebSocket (STOMP)** for low-latency message delivery and features advanced data management strategies like **Soft Delete** and granular message revocation.

### 🔗 **Live:** [https://realtime-chat-service-xc1e.onrender.com](https://realtime-chat-service-xc1e.onrender.com)
*(Note: Since it is hosted on a free tier, the initial load might take a few seconds to wake up the server)*

---

## 🚀 Key Features

### 💬 Core Messaging
* **Real-Time Communication:** Instant bi-directional messaging using Spring Boot WebSockets and StompJS.
* **Message Status:** Visual indicators for Sent, Delivered, and Seen statuses.
* **Rich Media Integration (Cloudinary):** *Securely upload and store **Images, Videos, and Documents***.
* Optimized media delivery via **Cloudinary API**.
* Support for previewing shared media directly in the chat bubble.
* **Typing Indicators:** Real-time feedback when the other user is typing.

### 🛠 Advanced Message Manipulation (Engineering Highlight)
* **Delete for Everyone (Revoke):** Implements a logical "Soft Delete" where the message content is replaced with a placeholder, preserving the chat history structure.
* **Delete for Me (Local Delete):** A complex relational database feature that hides specific messages only for the deleter while keeping them visible to others.
* **Edit Messages:** Allows users to edit sent messages within a specific time window (15 mins), with an "edited" flag.

### 🎨 Modern UI/UX
* **Custom Context Menu:** Right-click interaction for Reply, Copy, Select, and Delete actions.
* **Multi-Selection Mode:** Select multiple messages to delete or forward in bulk.
* **Optimistic UI:** UI updates instantly before the server response to ensure a smooth user experience.
* **Responsive Design:** Fully responsive layout compatible with Desktop and Mobile views.

### 📢 Administrative Features
* **Role-Based Access Control (RBAC):** Admin-only features integrated with Spring Security.
* **Announcement Channel:** Dedicated read-only channel for system-wide announcements by Admins.

---

## 🏗 Tech Stack

### Backend
* **Language:** Java 17
* **Framework:** Spring Boot 3.x
* **Security:** Spring Security (JWT Authentication)
* **Communication:** WebSocket (STOMP protocol)
* **Database:** PostgreSQL
* **Cloud Storage:** **Cloudinary** (Image/Video/File Management)
* **Build Tool:** Maven

### Frontend
* **Library:** React.js (v18)
* **Language:** TypeScript
* **State Management:** React Hooks (useState, useEffect, useContext)
* **Styling:** CSS3, FontAwesome
* **HTTP Client:** Axios

### DevOps & Deployment
* **Hosting:** **Render.com** (Backend & Frontend)
* **Containerization:** Docker
* **API Testing:** Postman
* **Version Control:** Git

---

## 📸 Screenshots

| Welcome Screen | Chat Interface |
|:---:|:---:|
| ![Welcome Screen](./screenshots/welcome.png) | ![Chat Interface](./screenshots/chat.png) |

| Context Menu | Delete Modal |
|:---:|:---:|
| ![Context Menu](./screenshots/context-menu.png) | ![Delete Modal](./screenshots/delete-modal.png) |

---

## ⚙️ Installation & Setup (Local)

### Prerequisites
* Java JDK 17+
* Node.js & npm
* PostgreSQL
* Cloudinary Account (for API Keys)

### 1. Clone the Repository
```bash
git clone https://github.com/yigitkagankartal/Realtime-chat.git
