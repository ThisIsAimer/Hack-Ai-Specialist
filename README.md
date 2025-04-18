# AI Specialist

Welcome to **AI Specialist**, a cutting-edge web application built to provide specialized AI-driven solutions. Powered by the Next.js framework, TypeScript, and a modern tech stack, this project delivers highly interactive and intelligent AI agents tailored for specific domains: **Doctor AI**, **Teacher AI**, **Lawyer AI**, and **Accountant AI**. With features like image and file reading, Retrieval-Augmented Generation (RAG), and a robust database integration, AI Specialist is designed to offer precise, context-aware responses for professional tasks.

## Features

- **Specialized AI Agents**: Four expertly prompted AI agents:
  - **Doctor AI**: Provides medical insights and advice (not a substitute for professional medical consultation).
  - **Teacher AI**: Assists with educational content, explanations, and tutoring.
  - **Lawyer AI**: Offers legal information and guidance (not legal advice).
  - **Accountant AI**: Helps with financial calculations, tax queries, and accounting tasks.
- **Image and File Reading**: Upload and process images or files to extract relevant information, powered by the Groq API and Cloudinary.
- **Retrieval-Augmented Generation (RAG)**: Enhances AI responses with context from a Neon DB, ensuring accurate and relevant answers.
- **Modern UI**: Built with Tailwind CSS and shadcn/ui for a sleek, responsive, and user-friendly interface.
- **Secure Authentication**: Implements Kinde for seamless and secure user authentication.
- **Scalable Backend**: Uses Prisma ORM with Neon DB for efficient data management and querying.

## Tech Stack

- **Framework**: Next.js (React framework with server-side rendering and API routes)
- **Language**: TypeScript (Static typing for robust code)
- **Styling**: Tailwind CSS (Utility-first CSS framework)
- **UI Components**: shadcn/ui (Accessible, customizable UI components)
- **Authentication**: Kinde (Secure and easy-to-use authentication)
- **AI API**: Groq (High-performance AI inference for specialized tasks)
- **Image/File Storage**: Cloudinary (Cloud-based media management)
- **Database**: Neon DB (Serverless PostgreSQL) with Prisma (Modern ORM)

## Getting Started

### Prerequisites

- **Node.js**: Version 18.x or higher
- **npm** or **yarn**: Package manager for dependencies
- **Accounts and API Keys**:
  - Kinde (for authentication)
  - Groq (for AI inference)
  - Cloudinary (for image/file storage)
  - Neon DB (for database hosting)

### Installation

1. **Clone the Repository**:

   ```bash
   git clone https://github.com/your-username/ai-specialist.git
   cd ai-specialist
   ```

2. **Install Dependencies**:

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set Up Prisma**: Initialize the database schema:

   ```bash
   npx prisma db push
   ```

4. **Run the Development Server**:

   ```bash
   npm run dev
   # or
   yarn dev
   ```

   Open http://localhost:3000 in your browser to see the app.

### Building for Production

1. **Build the Application**:

   ```bash
   npm run build
   ```

2. **Start the Production Server**:

   ```bash
   npm start
   ```

## Project Structure

```
ai-specialist/
├── app/                    # Next.js app directory (pages, API routes)
├── components/             # Reusable React components
├── lib/                    # Utilities (Prisma client, API helpers)
├── prisma/                 # Prisma schema and migrations
├── public/                 # Static assets
├── styles/                 # Tailwind CSS configuration
├── .env.local              # Environment variables (not tracked)
├── next.config.js          # Next.js configuration
├── tsconfig.json           # TypeScript configuration
├── middleware.ts           # middleware for kinde
├── slide-slick.d.ts        # component for slick
└── README.md               # Project documentation
```

## Usage

1. **Sign Up / Log In**:
   - Use the Kinde authentication flow to create an account or log in.
2. **Interact with AI Agents**:
   - Select an AI agent (Doctor, Teacher, Lawyer, or Accountant) from the dashboard (more on the way).
   - Input queries via text, upload images, or files for processing.
3. **RAG-Powered Responses**:
   - The app retrieves relevant documents from Neon DB to augment AI responses, ensuring context-aware answers.
4. **Manage Media**:
   - Upload images or files via Cloudinary integration for analysis by the AI agents.

## Contributing

We welcome contributions! To get started:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/your-feature`).
3. Make your changes and commit (`git commit -m "Add your feature"`).
4. Push to the branch (`git push origin feature/your-feature`).
5. Open a Pull Request.

Please follow our Code of Conduct and ensure your code adheres to the project's style guidelines.

## License

This project is licensed under the MIT License.

## Contact

For questions or feedback, reach out to the project maintainers:

- **Email**: androworkspace@gmail.com
- **GitHub Issues**: AI Specialist Issues

---

Built with ❤️ by Team RisingDevelopers