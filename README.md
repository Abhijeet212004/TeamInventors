<img src="topbanner.png" alt="AlertMate Banner" width="100%">

### The Challenge & Our Agentic Solution

In critical situations—whether a medical emergency, a natural disaster, or a personal safety threat—passive tools are not enough. You need an **Agentic System** that acts proactively.

**AlertMate is that system.**

AlertMate is an **Agentic AI & Offline-First Safety Ecosystem**. It doesn't just wait for you to call for help; it uses **Machine Learning** to detect anomalies, **Vector Search** to understand medical history, and **LoRa Mesh** to communicate when the world goes dark.

### Agentic AI & Machine Learning Core

AlertMate's intelligence is powered by a multi-model approach designed to act as a proactive guardian:

*   **Anomaly Detection Agent (Isolation Forest):**
    *   Continuously monitors user movement patterns (accelerometer, gyroscope, GPS).
    *   Detects deviations indicative of accidents, falls, or forced movements using an **Isolation Forest** model.
    *   *Outcome:* Automatically triggers a safety check or SOS without user intervention.

*   **Risk Classification Agent (XGBoost):**
    *   Analyzes environmental data and user vitals to classify the current safety risk level (Low, Moderate, Critical).
    *   *Outcome:* Adapts the app's behavior (e.g., increasing location update frequency) based on real-time risk assessment.

*   **Medical RAG Agent (Pinecone + OpenAI):**
    *   **The Brain:** A sophisticated **Retrieval-Augmented Generation (RAG)** system powered by **Pinecone Vector Database**.
    *   **The Process:** When a doctor scans a patient's QR code, the agent retrieves relevant medical reports (PDFs, images) based on semantic similarity to the doctor's queries.
    *   **The Insight:** It doesn't just "search"; it **synthesizes** complex medical histories into actionable clinical summaries, answering questions like *"Does this patient have any contraindications for anesthesia?"* instantly.

-----

### Resilient Infrastructure

*   **Offline LoRa Mesh:**
    *   When the internet fails, AlertMate switches to a custom **ESP32-based LoRa Mesh Network**.
    *   Messages hop from device to device, creating a decentralized communication web that works in disaster zones.

*   **Hardware Integration:**
    *   **ESP32:** Handles long-range offline communication.
    *   **MAX30100:** Real-time pulse oximetry and heart rate monitoring, fed directly into our risk models.

-----

### Our Vision in Action

See our Agentic Safety System in action. Watch our demo video for a complete walkthrough of the RAG Chatbot, Offline Mesh, and ML Triggers.

<p align="center">
  <!-- Video placeholder as requested -->
  <img src="https://placehold.co/600x400?text=Demo+Video+Coming+Soon" alt="Demo Video Placeholder" width="100%">
</p>

> **[View Our Technical Presentation (PDF)](AlertMate.pdf)**
>
> **Click above for a detailed breakdown of our ML architecture, RAG pipeline, and business model.**

-----

### System Architecture

AlertMate is a system of interconnected intelligent services:

*   **1. The User Experience (React Native)**
    *   **Unified Safety Hub:** A single mobile app for **Trip Monitoring**, **Offline Chat**, and **Medical Profile** management.
    *   **Smart Triggers:** **Shake-to-SOS** uses the device's accelerometer to trigger alarms automatically in emergencies.

*   **2. The Doctor's Portal (Agentic RAG)**
    *   **Instant Patient Insight:** Doctors scan a patient's QR code to access a dashboard displaying vitals, allergies, and reports.
    *   **Semantic Search:** Queries are embedded using OpenAI's `text-embedding-3-small` and matched against the **Pinecone** index.
    *   **Clinical Synthesis:** GPT-4o acts as the final reasoning layer, generating professional medical advice based on the retrieved context.

*   **3. The Backend & Intelligence**
    *   **Central API (Node.js & Express):** A robust **TypeScript** API manages user authentication, secure file storage (**Cloudinary**), and real-time socket connections.
    *   **ML Microservices (Python):** Exposes the trained **Isolation Forest** and **XGBoost** models via a fast API for real-time inference.

### Repository Structure

Here is a high-level overview of how our project is organized:

```text
AlertMate/
|--- backend/                # The core Node.js, TypeScript, Prisma API
|    |--- src/
|         |--- routes/       # API routes (Medical, Auth, Safety)
|         |--- module/       # Business logic modules
|    |--- prisma/            # Database schema and migrations
|
|--- mobile/                 # The React Native (Expo) mobile app
|    |--- app/               # Screens and navigation (Expo Router)
|    |--- components/        # Reusable UI components
|    |--- hooks/             # Custom hooks (useShake, useLocation)
|
|--- firmware/               # C++ code for ESP32 hardware
|    |--- offline_chat/      # LoRa mesh networking logic
|    |--- max30100/          # Pulse oximeter sensor logic
|
|--- ml_models/              # Python scripts for ML analysis
|    |--- model2/            # Isolation Forest & XGBoost models
|
|--- .env.example            # Example environment variables
|--- README.md               # You are here
```

<img src="mumbaihacks.jpeg" alt="Mumbai Hacks Banner" width="100%">
