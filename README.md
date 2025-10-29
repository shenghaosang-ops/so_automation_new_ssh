## Application Details
|               |
| ------------- |
|**Generation Date and Time**<br>Mon Aug 11 2025 09:12:47 GMT+0000 (Coordinated Universal Time)|
|**App Generator**<br>SAP Fiori Application Generator|
|**App Generator Version**<br>1.18.4|
|**Generation Platform**<br>SAP Business Application Studio|
|**Template Used**<br>Basic|
|**Service Type**<br>None|
|**Service URL**<br>N/A|
|**Module Name**<br>yegeoaiso|
|**Application Title**<br>SO Automation|
|**Namespace**<br>|
|**UI5 Theme**<br>sap_horizon|
|**UI5 Version**<br>1.139.0|
|**Enable Code Assist Libraries**<br>False|
|**Enable TypeScript**<br>False|
|**Add Eslint configuration**<br>False|

# 🚀 SO Automation Suite

A comprehensive **SAP UI5** application for end-to-end sales order processing automation, from data acquisition to email notification.

## ✨ Features

### 📋 Complete Workflow
1. **🔍 Data Acquisition** - Extract data from web pages or PDF documents using OCR and AI
2. **⚡ SO Automation** - Upload Excel data and process sales orders with AI-powered automation  
3. **☁️ SO Upload** - Validate and upload sales orders to ERP system with real-time status tracking
4. **📧 Email Configuration** - Configure and send automated email notifications with upload results

### 🎯 Key Capabilities
- **Multi-source Data Import**: Excel files, web scraping, PDF extraction
- **AI-Powered Processing**: Automated sales order validation and processing
- **Real-time Status Tracking**: Live progress monitoring and error handling
- **ERP Integration**: Direct upload to SAP systems
- **Email Automation**: Configurable success/failure notifications
- **Responsive Design**: SAP Fiori compliant UI with left-right margins

## 🛠️ Technology Stack

- **Frontend**: SAP UI5 / OpenUI5 (v1.139.0)
- **Build Tool**: SAP Fiori Tools
- **Package Manager**: npm
- **Architecture**: MVC Pattern with Service Layer
- **Styling**: SAP Horizon Theme

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (LTS version) - [Download here](https://nodejs.org)
- **npm** (comes with Node.js)
- **Git** - [Download here](https://git-scm.com)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
# Clone from GitHub
git clone https://github.com/shenghaosang-ops/so_automation_new_ssh.git

# Navigate to project directory
cd so_automation_new_ssh
```

### 2. Install Dependencies

```bash
# Install all required packages
npm install
```

### 3. Start the Application

```bash
# Start development server
npm run start-noflp

# Or start with Fiori Launchpad
npm start
```

### 4. Access the Application

Open your browser and navigate to:
- **Local URL**: http://localhost:8080
- **Direct Access**: http://localhost:8080/index.html

## 📁 Project Structure

```
webapp/
├── controller/           # Page Controllers
│   ├── Home.controller.js
│   ├── DataAcquisition.controller.js
│   ├── View1.controller.js (SO Automation)
│   ├── SOUpload.controller.js
│   └── EmailNotification.controller.js
├── services/            # Business Logic Services  
│   ├── DataAcquisitionService.js
│   ├── SOUploadService.js
│   ├── EmailService.js
│   ├── ApiService.js
│   ├── BatchProcessor.js
│   ├── FileHandler.js
│   ├── ResultsHandler.js
│   ├── RuleManager.js
│   └── TableManager.js
├── view/               # UI Views
│   ├── Home.view.xml
│   ├── DataAcquisition.view.xml
│   ├── View1.view.xml
│   ├── SOUpload.view.xml
│   └── EmailNotification.view.xml
├── model/              # Data Models
├── css/                # Custom Styles
└── i18n/              # Internationalization
```

## 🔧 Available Scripts

```bash
# Development
npm run start-noflp          # Start without Fiori Launchpad
npm start                    # Start with Fiori Launchpad
npm run start-local          # Start with local configuration

# Testing
npm run unit-test           # Run unit tests
npm run int-test           # Run integration tests

# Building
npm run build              # Build for production
```

## 🌐 Application Flow

```
🏠 Home Page
    ↓
📊 Data Acquisition (Choose data source)
    ↓  
⚡ SO Automation (Process Excel data)
    ↓
☁️ SO Upload (Upload to ERP)
    ↓
📧 Email Notification (Send results)
```

## 🔍 Usage Guide

### Step 1: Data Acquisition
- Choose between **Structured Data** (web scraping) or **Unstructured Data** (PDF upload)
- Configure web scraping parameters or upload PDF files
- Click **Next** to proceed

### Step 2: SO Automation  
- Upload Excel file with sales order data
- Select customer and batch size
- Click **Start AI Automation** to process
- Monitor real-time progress

### Step 3: SO Upload
- Review processed data and validation results
- Click **Check Data** to validate fields
- Click **Execute Upload** to send to ERP system
- View upload status and results

### Step 4: Email Configuration
- Configure email settings for success/failure scenarios
- Review data table with status column
- Click **Send Email** to notify stakeholders

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/shenghaosang-ops/so_automation_new_ssh/issues) page
2. Create a new issue with detailed description
3. Contact the development team

## 🔄 Version History

- **v1.0** - Initial release with full workflow
- **Current**: Multi-page architecture with service layer

---

**Built with ❤️ using SAP UI5 and Fiori Design Guidelines**


