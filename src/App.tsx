import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Briefcase, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar, 
  ShieldCheck, 
  Heart, 
  Upload, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft,
  AlertCircle,
  Building2,
  BadgeCheck,
  Lock,
  LogOut,
  LayoutDashboard,
  UserPlus,
  Settings,
  Sparkles,
  Users as UsersIcon,
  Plus,
  Edit,
  Trash2,
  FileSpreadsheet,
  FileText,
  Eye,
  ExternalLink,
  Download,
  X,
  Menu,
  Clock,
  CheckCircle,
  XCircle,
  Car,
  ClipboardCheck,
  Star,
  MessageSquare,
  History,
  Info,
  Search,
  Filter,
  Share2,
  MessageCircle,
  Copy,
  Link
} from 'lucide-react';
import { ApplicantData, UserProfile, Role, KidDetail, SiblingDetail, ExperienceDetail, ApplicantStatus } from './types';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  PieChart, Pie, Cell, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line
} from 'recharts';

const LOGO_URL = "https://ais-pre-awfv3avjvayaggymk2gcon-139749521758.asia-east1.run.app/logo.png";

const CompanyLogo = ({ className = "w-full h-full object-cover" }: { className?: string }) => {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="w-full h-full bg-indigo-600 flex items-center justify-center">
        <Building2 className="w-1/2 h-1/2 text-white" />
      </div>
    );
  }

  return (
    <img 
      src={LOGO_URL} 
      alt="Jailaxmi Group" 
      className={className} 
      referrerPolicy="no-referrer"
      onError={() => setError(true)}
    />
  );
};

// Initial empty state for a new applicant form
const INITIAL_DATA: ApplicantData = {
  id: '',
  fullName: '',
  fatherName: '',
  fatherEducation: '',
  fatherSalary: '',
  fatherEmployment: '',
  fatherMobile: '',
  motherName: '',
  motherEducation: '',
  motherSalary: '',
  motherEmployment: '',
  motherMobile: '',
  spouseName: '',
  spouseEducation: '',
  spouseSalary: '',
  spouseEmployment: '',
  spouseMobile: '',
  gender: '',
  dob: '',
  mobileNumber: '',
  emailId: '',
  permanentAddress: '',
  city: '',
  pincode: '',
  aadhaarNumber: '',
  panNumber: '',
  drivingLicenceNumber: '',
  bloodGroup: '',
  maritalStatus: '',
  numberOfKids: 0,
  kidsDetails: [],
  numberOfSiblings: 0,
  siblingsDetails: [],
  emergencyContactName: '',
  emergencyContactNumber: '',
  experienceType: '',
  positionApplied: '',
  branch: '',
  district: '',
  degreeType: '',
  instituteName: '',
  educationDetails: '',
  passedOutYear: '',
  numberOfCompanies: 0,
  experienceDetails: [],
  currentSalary: '',
  expectedSalary: '',
  sourceOfApplication: '',
  sourceRemark: '',
  refererName: '',
  refererBranch: '',
  refererDesignation: '',
  refererEmpId: '',
  refererMobile: '',
  interviewScore: '',
  interviewRemarks: '',
  techScore: 0,
  commScore: 0,
  fitScore: 0,
  status: 'Applied',
  resume: null,
  resumePath: '',
  submittedBy: '',
  submittedAt: '',
};

const ALL_STEPS = [
  { id: 'personal', title: 'Personal', icon: User },
  { id: 'family', title: 'Family', icon: UsersIcon },
  { id: 'contact', title: 'Contact', icon: MapPin },
  { id: 'identity', title: 'Identity', icon: ShieldCheck },
  { id: 'professional', title: 'Career', icon: Briefcase },
  { id: 'evaluation', title: 'Evaluation', icon: ClipboardCheck },
];

// Main Application Component
export default function App() {
  // --- State Management ---
  // User authentication state
  const [user, setUser] = useState<UserProfile | null>(null);
  // Current active view/page in the application
  const [view, setView] = useState<'DASHBOARD' | 'FORM' | 'ANALYTICS' | 'USERS' | 'EVALUATION' | 'REPORTS' | 'PUBLIC_FORM'>('DASHBOARD');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Data states
  const [applicants, setApplicants] = useState<ApplicantData[]>([]);
  const [systemUsers, setSystemUsers] = useState<UserProfile[]>([]);
  
  const STEPS = view === 'PUBLIC_FORM' ? ALL_STEPS.slice(0, 5) : ALL_STEPS;
  
  // Login form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');

  // Date filter states for Dashboard/Reports
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Applicant Form states
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<ApplicantData>(INITIAL_DATA);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingResume, setViewingResume] = useState<File | null>(null);
  const [dashboardStatusFilter, setDashboardStatusFilter] = useState<string>('Total');
  const [showShareMenu, setShowShareMenu] = useState(false);
  
  // Check for public form in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'apply') {
      setView('PUBLIC_FORM');
      setFormData(prev => ({ ...prev, submittedBy: params.get('hrId') || '' }));
    }
  }, []);
  
  // Validation error states
  const [aadhaarError, setAadhaarError] = useState('');
  const [mobileError, setMobileError] = useState('');

  // Filter applicants based on user role (Admin sees all, HR sees only their own)
  const displayApplicants = React.useMemo(() => {
    if (!user) return [];
    if (user.role === 'ADMIN') return applicants;
    return applicants.filter(app => app.submittedBy === user.id);
  }, [applicants, user]);

  // Effect to check if Aadhaar number already exists in the last 30 days
  useEffect(() => {
    const checkAadhaar = async () => {
      const normalized = formData.aadhaarNumber.replace(/\s/g, '');
      if (normalized.length === 12 && !editingId) {
        try {
          console.log('Checking Aadhaar:', normalized);
          const response = await fetch(`/api/check-aadhaar?number=${normalized}`);
          const data = await response.json();
          if (data.exists) {
            setAadhaarError('Already Interviewed: This candidate has attended an interview within the last 30 days.');
          } else {
            setAadhaarError('');
          }
        } catch (error) {
          console.error('Aadhaar check failed:', error);
        }
      } else {
        setAadhaarError('');
      }
    };
    checkAadhaar();
  }, [formData.aadhaarNumber, editingId]);

  // Effect to check if Mobile number already exists in the last 60 days
  useEffect(() => {
    const checkMobile = async () => {
      if (formData.mobileNumber.length === 10 && !editingId) {
        try {
          const response = await fetch(`/api/check-mobile?number=${formData.mobileNumber}`);
          const data = await response.json();
          if (data.exists) {
            setMobileError('Already Exist: This mobile number is already registered within the last 60 days.');
          } else {
            setMobileError('');
          }
        } catch (error) {
          console.error('Mobile check failed:', error);
        }
      } else {
        setMobileError('');
      }
    };
    checkMobile();
  }, [formData.mobileNumber, editingId]);
  // Resume viewer states
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [viewingFileName, setViewingFileName] = useState<string>('');
  const [viewingFileType, setViewingFileType] = useState<string>('');
  const [viewingFileSize, setViewingFileSize] = useState<number>(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formMessage, setFormMessage] = useState({ text: '', type: '' });

  // Function to fetch all applicants from the backend
  const fetchApplicants = async () => {
    try {
      const response = await fetch('/api/applicants');
      if (response.ok) {
        const data = await response.json();
        setApplicants(data);
      }
    } catch (error) {
      console.error('Failed to fetch applicants:', error);
    }
  };

  // Function to fetch all system users (Admin only)
  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setSystemUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchApplicants();
      fetchUsers();
    }
  }, [user]);

  useEffect(() => {
    if (viewingResume) {
      const url = URL.createObjectURL(viewingResume);
      setResumeUrl(url);
      setViewingFileName(viewingResume.name);
      setViewingFileType(viewingResume.type);
      setViewingFileSize(viewingResume.size);
      return () => URL.revokeObjectURL(url);
    }
  }, [viewingResume]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle user login authentication
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPass }),
      });
      if (response.ok) {
        const foundUser = await response.json();
        setUser(foundUser);
        setLoginError('');
        setView('DASHBOARD');
      } else {
        setLoginError('Invalid email or password. Please check your credentials and try again.');
        setLoginPass('');
      }
    } catch (error) {
      setLoginError('Login failed. Please try again later.');
    }
  };

  // Handle user logout and reset application state
  const handleLogout = () => {
    setUser(null);
    setLoginEmail('');
    setLoginPass('');
    setIsSubmitted(false);
    setCurrentStep(0);
    setView('DASHBOARD');
  };

  // Handle general input changes for the applicant form
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleKidChange = (index: number, field: keyof KidDetail, value: string) => {
    const newKids = [...formData.kidsDetails];
    newKids[index] = { ...newKids[index], [field]: value };
    setFormData(prev => ({ ...prev, kidsDetails: newKids }));
  };

  const handleSiblingChange = (index: number, field: keyof SiblingDetail, value: string) => {
    const newSiblings = [...formData.siblingsDetails];
    newSiblings[index] = { ...newSiblings[index], [field]: value };
    setFormData(prev => ({ ...prev, siblingsDetails: newSiblings }));
  };

  const handleExperienceChange = (index: number, field: keyof ExperienceDetail, value: string) => {
    const newExp = [...formData.experienceDetails];
    newExp[index] = { ...newExp[index], [field]: value };
    setFormData(prev => ({ ...prev, experienceDetails: newExp }));
  };

  const updateKidsCount = (count: number) => {
    const currentKids = [...formData.kidsDetails];
    if (count > currentKids.length) {
      for (let i = currentKids.length; i < count; i++) {
        currentKids.push({ name: '', age: '', education: '' });
      }
    } else {
      currentKids.splice(count);
    }
    setFormData(prev => ({ ...prev, numberOfKids: count, kidsDetails: currentKids }));
  };

  const updateSiblingsCount = (count: number) => {
    const currentSiblings = [...formData.siblingsDetails];
    if (count > currentSiblings.length) {
      for (let i = currentSiblings.length; i < count; i++) {
        currentSiblings.push({ name: '', age: '', gender: '', education: '', location: '' });
      }
    } else {
      currentSiblings.splice(count);
    }
    setFormData(prev => ({ ...prev, numberOfSiblings: count, siblingsDetails: currentSiblings }));
  };

  const updateExperienceCount = (count: number) => {
    const currentExp = [...formData.experienceDetails];
    if (count > currentExp.length) {
      for (let i = currentExp.length; i < count; i++) {
        currentExp.push({ companyName: '', role: '', salary: '', yearsOfWork: '' });
      }
    } else {
      currentExp.splice(count);
    }
    setFormData(prev => ({ ...prev, numberOfCompanies: count, experienceDetails: currentExp }));
  };

  // Handle file selection for resume upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setViewingResume(e.target.files[0]);
    }
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0));

  // Handle form submission (either moving to next step or final submit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMessage({ text: '', type: '' });
    
    // Basic validation: Check if required fields are filled
    if (!formData.fullName || !formData.emailId || !formData.mobileNumber) {
      setFormMessage({ text: 'Please fill in all required fields (Full Name, Email, Mobile).', type: 'error' });
      return;
    }

    if (aadhaarError) {
      setFormMessage({ text: aadhaarError, type: 'error' });
      return;
    }

    if (mobileError) {
      setFormMessage({ text: mobileError, type: 'error' });
      return;
    }

    // If not on the last step, just move to next step
    if (currentStep < STEPS.length - 1) {
      nextStep();
      return;
    }

    const timestamp = new Date().toISOString();
    
    try {
      let resumePath = formData.resumePath;
      
      // Upload resume if present
      if (viewingResume) {
        const fileData = new FormData();
        fileData.append('candidateName', formData.fullName || 'Candidate');
        fileData.append('resume', viewingResume);
        const uploadRes = await fetch('/api/upload-resume', {
          method: 'POST',
          body: fileData
        });
        
        if (uploadRes.ok) {
          const contentType = uploadRes.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const uploadData = await uploadRes.json();
            resumePath = uploadData.path;
          }
        }
      }

      if (editingId) {
        const updatedData = { ...formData, submittedAt: timestamp, resumePath };
        const response = await fetch(`/api/applicants/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedData),
        });
        if (response.ok) {
          setEditingId(null);
          await fetchApplicants();
        } else {
          const contentType = response.headers.get('content-type');
          let errorMessage = 'Failed to update applicant';
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          }
          throw new Error(errorMessage);
        }
      } else {
        const newApplicant = {
          ...formData,
          id: Math.random().toString(36).substr(2, 9),
          submittedBy: view === 'PUBLIC_FORM' ? formData.submittedBy : (user?.id || ''),
          submittedAs: view === 'PUBLIC_FORM' ? 'Candidate' : 'HR',
          submittedAt: timestamp,
          resumePath
        };
        const response = await fetch('/api/applicants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newApplicant),
        });
        if (response.ok) {
          if (view !== 'PUBLIC_FORM') await fetchApplicants();
        } else {
          const contentType = response.headers.get('content-type');
          let errorMessage = 'Failed to save data';
          
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            if (errorData.error === "Already Interviewed within the last 30 days") {
              setFormMessage({ text: "Already Interviewed: This candidate has already attended an interview within the last 30 days.", type: 'error' });
              return;
            }
            errorMessage = errorData.error || errorMessage;
          }
          throw new Error(errorMessage);
        }
      }
      setIsSubmitted(true);
    } catch (error: any) {
      console.error('Failed to submit applicant:', error);
      setFormMessage({ text: error.message || 'Failed to save data to database.', type: 'error' });
    }
  };

  const handleEdit = (applicant: ApplicantData) => {
    setFormData(applicant);
    setEditingId(applicant.id);
    setCurrentStep(0);
    setViewingResume(null);
    setFormMessage({ text: '', type: '' });
    setView('FORM');
    setIsSubmitted(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/applicants/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        await fetchApplicants();
      }
    } catch (error) {
      console.error('Failed to delete applicant:', error);
    }
  };

  const formatDateTime = (dateStr: string, timeStr: string) => {
    if (!dateStr) return 'N/A';
    
    // dateStr is expected to be YYYY-MM-DD
    const [year, month, day] = dateStr.split('-');
    const formattedDate = `${day}-${month}-${year}`;
    
    if (!timeStr) return formattedDate;
    
    // timeStr is expected to be HH:MM (24h)
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    const formattedTime = `${h12.toString().padStart(2, '0')}:${minutes} ${ampm}`;
    
    return `${formattedDate} ${formattedTime}`;
  };

  const flattenApplicantData = (app: ApplicantData) => {
    const flattened: any = {
      'ID': app.id,
      'Full Name': app.fullName,
      'Gender': app.gender,
      'DOB': app.dob,
      'Mobile': app.mobileNumber,
      'Email': app.emailId,
      'Blood Group': app.bloodGroup,
      'Marital Status': app.maritalStatus,
      'Permanent Address': app.permanentAddress,
      'City': app.city,
      'Pincode': app.pincode,
      'Aadhaar': app.aadhaarNumber,
      'PAN': app.panNumber,
      'Driving Licence': app.drivingLicenceNumber,
      'Emergency Contact': app.emergencyContactName,
      'Emergency Phone': app.emergencyContactNumber,
      'Position Applied': app.positionApplied,
      'Branch': app.branch,
      'District': app.district,
      
      'Father Name': app.fatherName,
      'Father Education': app.fatherEducation,
      'Father Salary': app.fatherSalary,
      'Father Employment': app.fatherEmployment,
      'Father Mobile': app.fatherMobile,
      
      'Mother Name': app.motherName,
      'Mother Education': app.motherEducation,
      'Mother Salary': app.motherSalary,
      'Mother Employment': app.motherEmployment,
      'Mother Mobile': app.motherMobile,
      
      'Spouse Name': app.spouseName,
      'Spouse Education': app.spouseEducation,
      'Spouse Salary': app.spouseSalary,
      'Spouse Employment': app.spouseEmployment,
      'Spouse Mobile': app.spouseMobile,
      
      'Experience Type': app.experienceType,
      'Degree Type': app.degreeType,
      'Institute': app.instituteName,
      'Education Details': app.educationDetails,
      'Passed Out Year': app.passedOutYear,
      'Current Salary': app.currentSalary,
      'Expected Salary': app.expectedSalary,
      'Source': app.sourceOfApplication,
      'Source Remark': app.sourceRemark,
      'Referer Name': app.refererName,
      'Referer Emp ID': app.refererEmpId,
      'Referer Mobile': app.refererMobile,
      
      'Interview Score': app.interviewScore,
      'Interview Remarks': app.interviewRemarks,
      'Interview Schedule': app.status === 'Interview' ? formatDateTime(app.interviewDate, app.interviewTime) : 'N/A',
      'Status': app.status,
      'Submitted By': systemUsers.find(u => u.id === app.submittedBy)?.name || 'System',
      'Submitted At': app.submittedAt ? new Date(app.submittedAt).toLocaleString() : 'N/A',
      'Resume Path': app.resumePath || 'N/A'
    };

    app.kidsDetails.forEach((kid, i) => {
      flattened[`Kid ${i+1} Name`] = kid.name;
      flattened[`Kid ${i+1} Age`] = kid.age;
      flattened[`Kid ${i+1} Education`] = kid.education;
    });

    app.siblingsDetails.forEach((sib, i) => {
      flattened[`Sibling ${i+1} Name`] = sib.name;
      flattened[`Sibling ${i+1} Age`] = sib.age;
      flattened[`Sibling ${i+1} Gender`] = sib.gender;
      flattened[`Sibling ${i+1} Education`] = sib.education;
      flattened[`Sibling ${i+1} Location`] = sib.location;
    });

    app.experienceDetails.forEach((exp, i) => {
      flattened[`Company ${i+1} Name`] = exp.companyName;
      flattened[`Company ${i+1} Role`] = exp.role;
      flattened[`Company ${i+1} Salary`] = exp.salary;
      flattened[`Company ${i+1} Years`] = exp.yearsOfWork;
    });

    return flattened;
  };

  const downloadExcel = () => {
    if (filteredApplicants.length === 0) return;
    const data = filteredApplicants.map(app => flattenApplicantData(app));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Candidates");
    XLSX.writeFile(workbook, `HRMS_Full_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const downloadSingleExcel = (app: ApplicantData) => {
    const data = [flattenApplicantData(app)];
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Candidate Details");
    XLSX.writeFile(workbook, `${app.fullName.replace(/\s+/g, '_')}_Details.xlsx`);
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.text("Candidates Performance Report", 14, 15);
    
    const tableData = filteredApplicants.map(app => [
      app.fullName,
      app.positionApplied || 'N/A',
      app.mobileNumber,
      app.interviewScore || '-',
      app.status,
      app.status === 'Interview' ? formatDateTime(app.interviewDate, app.interviewTime) : 'N/A',
      app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : 'N/A'
    ]);

    autoTable(doc, {
      head: [['Name', 'Position', 'Mobile', 'Score', 'Status', 'Interview Schedule', 'Submitted Date']],
      body: tableData,
      startY: 20,
    });

    doc.save(`Performance_Report_${new Date().toLocaleDateString()}.pdf`);
  };

  const filteredApplicants = (user?.role === 'ADMIN' 
    ? applicants 
    : applicants.filter(a => a.submittedBy === user?.id)
  ).filter(app => {
    if (!startDate && !endDate) return true;
    if (!app.submittedAt) return false;

    // Handle both ISO strings and locale strings for backward compatibility
    let appDate: Date;
    try {
      appDate = new Date(app.submittedAt);
      if (isNaN(appDate.getTime())) {
        // Fallback for some locale string formats if Date constructor fails
        const parts = (app.submittedAt || '').split(',')[0].split('/');
        if (parts.length === 3) {
          // Assuming M/D/YYYY or D/M/YYYY - this is risky but better than nothing
          // Let's try to parse it more carefully if needed, but ISO is the goal
          appDate = new Date(app.submittedAt);
        }
      }
    } catch (e) {
      return false;
    }

    if (isNaN(appDate.getTime())) return false;

    appDate.setHours(0, 0, 0, 0);
    
    const start = startDate ? new Date(startDate + 'T00:00:00') : new Date(0);
    const end = endDate ? new Date(endDate + 'T23:59:59') : new Date();

    return appDate.getTime() >= start.getTime() && appDate.getTime() <= end.getTime();
  });

  // Calculate dashboard statistics based on filtered applicants
  const stats = {
    total: filteredApplicants.length,
    applied: filteredApplicants.filter(a => a.status === 'Applied').length,
    screening: filteredApplicants.filter(a => a.status === 'Screening').length,
    interviewed: filteredApplicants.filter(a => a.status === 'Interview').length,
    offered: filteredApplicants.filter(a => a.status === 'Offered').length,
    waitingList: filteredApplicants.filter(a => a.status === 'Waiting List').length,
    rejected: filteredApplicants.filter(a => a.status === 'Rejected').length,
    onboarded: filteredApplicants.filter(a => a.status === 'Onboarded').length,
  };

  // If user is not logged in and not on public form, show the Login screen
  if (!user && view !== 'PUBLIC_FORM') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-bg-main">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full glass-card p-10"
        >
          <div className="text-center mb-10">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl border-4 border-indigo-500/20 overflow-hidden">
              <CompanyLogo />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">Jailaxmi Group</h1>
            <p className="text-indigo-400 font-bold uppercase tracking-widest text-[10px] mt-1">Salem, Tamil Nadu</p>
            <p className="text-slate-500 mt-4 font-medium text-sm">Human Resource Management System</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="label-text">Email Address</label>
              <div className="relative">
                {!loginEmail && <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />}
                <input 
                  type="email" 
                  className={`input-field ${!loginEmail ? 'pl-16' : 'pl-5'}`} 
                  placeholder="name@prohrms.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <label className="label-text">Password</label>
              <div className="relative">
                {!loginPass && <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />}
                <input 
                  type="password" 
                  className={`input-field ${!loginPass ? 'pl-16' : 'pl-5'}`} 
                  placeholder="••••••••"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  required
                />
              </div>
            </div>

            {loginError && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex gap-3 items-start"
              >
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-rose-600 leading-relaxed">{loginError}</p>
              </motion.div>
            )}

            <button type="submit" className="btn-primary w-full group">
              Sign In to Portal
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Authorized Access Only</p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Main Application Layout (Sidebar + Content Area)
  return (
    <div className="min-h-screen flex">
      {/* Sidebar Navigation */}
      {user && view !== 'PUBLIC_FORM' && (
        <aside className="w-72 bg-card-bg border-r border-white/5 hidden lg:flex flex-col p-6">
        <div className="flex items-center gap-5 mb-12 px-2">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg overflow-hidden shrink-0">
            <CompanyLogo />
          </div>
          <div>
            <p className="text-sm font-black tracking-tight text-white leading-none">Jailaxmi</p>
            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-1">Group Salem</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          <button 
            onClick={() => setView('DASHBOARD')}
            className={`w-full flex items-center gap-5 px-4 py-3 rounded-2xl font-bold transition-all ${
              view === 'DASHBOARD' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-white/5'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" /> Dashboard
          </button>
          <button 
            onClick={() => setView('EVALUATION')}
            className={`w-full flex items-center gap-5 px-4 py-3 rounded-2xl font-bold transition-all ${
              view === 'EVALUATION' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-white/5'
            }`}
          >
            <BadgeCheck className="w-5 h-5" /> Evaluation
          </button>
          <button 
            onClick={() => {
              setView('FORM');
              setIsSubmitted(false);
              setCurrentStep(0);
              setFormData(INITIAL_DATA);
              setViewingResume(null);
            }}
            className={`w-full flex items-center gap-5 px-4 py-3 rounded-2xl font-bold transition-all ${
              view === 'FORM' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-white/5'
            }`}
          >
            <UserPlus className="w-5 h-5" /> New Applicant
          </button>

          {user?.role === 'ADMIN' && (
            <button 
              onClick={() => { setView('ANALYTICS'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-5 px-4 py-3 rounded-2xl font-bold transition-all ${
                view === 'ANALYTICS' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-white/5'
              }`}
            >
              <Sparkles className="w-5 h-5" /> Analytics
            </button>
          )}

          <button 
            onClick={() => { setView('REPORTS'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-5 px-4 py-3 rounded-2xl font-bold transition-all ${
              view === 'REPORTS' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-white/5'
            }`}
          >
            <FileSpreadsheet className="w-5 h-5" /> Reports
          </button>

          {user?.role === 'ADMIN' && (
            <button 
              onClick={() => { setView('USERS'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-5 px-4 py-3 rounded-2xl font-bold transition-all ${
                view === 'USERS' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-white/5'
              }`}
            >
              <UsersIcon className="w-5 h-5" /> User Management
            </button>
          )}

          <button className="w-full flex items-center gap-5 px-4 py-3 text-slate-400 hover:bg-white/5 rounded-2xl font-bold transition-all">
            <Settings className="w-5 h-5" /> Settings
          </button>
        </nav>

          <div className="mt-auto pt-6 border-t border-white/5">
            <div className="flex items-center gap-5 mb-6 px-2">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-full flex items-center justify-center font-black text-white">
                {user.name.charAt(0)}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-bold text-white truncate">{user.name}</p>
                <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider">{user.role}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-5 px-4 py-3 text-rose-400 hover:bg-rose-500/10 rounded-2xl font-bold transition-all"
            >
              <LogOut className="w-5 h-5" /> Sign Out
            </button>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <main className={`flex-1 overflow-y-auto p-6 sm:p-10 lg:p-12 ${view === 'PUBLIC_FORM' ? 'w-full' : ''}`}>
        <div className="max-w-4xl mx-auto">
          {/* Top Bar Mobile */}
          {user && view !== 'PUBLIC_FORM' && (
            <div className="lg:hidden flex items-center justify-between mb-8 bg-card-bg/50 backdrop-blur-xl p-4 rounded-2xl border border-white/5 sticky top-0 z-40">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 text-slate-400 hover:bg-white/5 rounded-xl"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg overflow-hidden">
                  <CompanyLogo />
                </div>
                <span className="text-lg font-black tracking-tight text-white">Jailaxmi HRMS</span>
              </div>
            </div>
            <button onClick={handleLogout} className="p-2 text-rose-500 bg-rose-500/10 rounded-xl">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
          )}

          {/* Mobile Menu Overlay */}
          <AnimatePresence>
            {user && isMobileMenuOpen && view !== 'PUBLIC_FORM' && (
              <motion.div 
                initial={{ opacity: 0, x: -100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className="lg:hidden fixed inset-0 z-50 bg-bg-main flex flex-col p-6"
              >
                <div className="flex items-center justify-between mb-12">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
                      <CompanyLogo />
                    </div>
                    <div>
                      <p className="text-sm font-black tracking-tight text-white leading-none">Jailaxmi</p>
                      <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-1">Group Salem</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 text-slate-400 hover:bg-white/5 rounded-xl"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <nav className="flex-1 space-y-2">
                  <button 
                    onClick={() => { setView('DASHBOARD'); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-5 px-4 py-4 rounded-2xl font-bold transition-all ${
                      view === 'DASHBOARD' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-white/5'
                    }`}
                  >
                    <LayoutDashboard className="w-5 h-5" /> Dashboard
                  </button>
                  <button 
                    onClick={() => { setView('EVALUATION'); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-5 px-4 py-4 rounded-2xl font-bold transition-all ${
                      view === 'EVALUATION' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-white/5'
                    }`}
                  >
                    <BadgeCheck className="w-5 h-5" /> Evaluation
                  </button>
                  <button 
                    onClick={() => {
                      setView('FORM');
                      setIsSubmitted(false);
                      setCurrentStep(0);
                      setFormData(INITIAL_DATA);
                      setViewingResume(null);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-5 px-4 py-4 rounded-2xl font-bold transition-all ${
                      view === 'FORM' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-white/5'
                    }`}
                  >
                    <UserPlus className="w-5 h-5" /> New Applicant
                  </button>

                  {user?.role === 'ADMIN' && (
                    <button 
                      onClick={() => { setView('ANALYTICS'); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-5 px-4 py-4 rounded-2xl font-bold transition-all ${
                        view === 'ANALYTICS' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-white/5'
                      }`}
                    >
                      <Sparkles className="w-5 h-5" /> Analytics
                    </button>
                  )}

                  <button 
                    onClick={() => { setView('REPORTS'); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-5 px-4 py-4 rounded-2xl font-bold transition-all ${
                      view === 'REPORTS' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-white/5'
                    }`}
                  >
                    <FileSpreadsheet className="w-5 h-5" /> Reports
                  </button>

                  {user?.role === 'ADMIN' && (
                    <button 
                      onClick={() => { setView('USERS'); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-5 px-4 py-4 rounded-2xl font-bold transition-all ${
                        view === 'USERS' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-white/5'
                      }`}
                    >
                      <UsersIcon className="w-5 h-5" /> User Management
                    </button>
                  )}
                </nav>

                <div className="mt-auto pt-6 border-t border-white/5">
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-5 px-4 py-4 text-rose-400 hover:bg-rose-500/10 rounded-2xl font-bold transition-all"
                  >
                    <LogOut className="w-5 h-5" /> Sign Out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Content Area - Renders different views based on state */}
          {view === 'DASHBOARD' ? (
            <div className="space-y-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h2 className="text-3xl font-black text-white tracking-tight">Recruitment Dashboard</h2>
                  <p className="text-slate-400 mt-1 font-medium">Overview of candidate pipeline and status</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/5">
                    <input 
                      type="date" 
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-transparent text-xs font-bold text-slate-300 outline-none px-2 py-1"
                    />
                    <span className="text-slate-600">to</span>
                    <input 
                      type="date" 
                      value={endDate} 
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-transparent text-xs font-bold text-slate-300 outline-none px-2 py-1"
                    />
                    {(startDate || endDate) && (
                      <button 
                        onClick={() => { setStartDate(''); setEndDate(''); }}
                        className="p-1 text-rose-400 hover:text-rose-300"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <button 
                    onClick={downloadExcel}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20 hover:bg-emerald-500/20 transition-all text-sm font-bold"
                  >
                    <FileSpreadsheet className="w-4 h-4" /> Excel
                  </button>
                  <button 
                    onClick={downloadPDF}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-500 rounded-xl border border-rose-500/20 hover:bg-rose-500/20 transition-all text-sm font-bold"
                  >
                    <FileText className="w-4 h-4" /> PDF
                  </button>
                  <button 
                    onClick={() => {
                      setFormData(INITIAL_DATA);
                      setEditingId(null);
                      setViewingResume(null);
                      setFormMessage({ text: '', type: '' });
                      setView('FORM');
                    }}
                    className="btn-primary"
                  >
                    <Plus className="w-5 h-5" /> Add New Candidate
                  </button>
                  <div className="relative">
                    <button 
                      onClick={() => setShowShareMenu(!showShareMenu)}
                      className="btn-secondary"
                    >
                      <Share2 className="w-5 h-5" /> Share Public Form
                    </button>
                    <AnimatePresence>
                      {showShareMenu && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute right-0 mt-2 w-56 bg-card-bg border border-white/10 rounded-xl shadow-xl overflow-hidden z-50"
                        >
                          <button 
                            onClick={() => {
                              const link = `${window.location.origin}/?mode=apply&hrId=${user?.id}`;
                              window.open(`https://wa.me/?text=${encodeURIComponent(`Please fill out the application form: ${link}`)}`, '_blank');
                              setShowShareMenu(false);
                            }}
                            className="w-full text-left px-4 py-3 text-sm font-medium text-slate-300 hover:bg-white/5 flex items-center gap-3"
                          >
                            <MessageCircle className="w-4 h-4 text-emerald-400" /> WhatsApp
                          </button>
                          <button 
                            onClick={() => {
                              const link = `${window.location.origin}/?mode=apply&hrId=${user?.id}`;
                              window.open(`mailto:?subject=Application Form&body=${encodeURIComponent(`Please fill out the application form: ${link}`)}`, '_blank');
                              setShowShareMenu(false);
                            }}
                            className="w-full text-left px-4 py-3 text-sm font-medium text-slate-300 hover:bg-white/5 flex items-center gap-3"
                          >
                            <Mail className="w-4 h-4 text-indigo-400" /> Email
                          </button>
                          <button 
                            onClick={() => {
                              const link = `${window.location.origin}/?mode=apply&hrId=${user?.id}`;
                              navigator.clipboard.writeText(link);
                              setFormMessage({ text: 'Public form link copied to clipboard!', type: 'success' });
                              setTimeout(() => setFormMessage({ text: '', type: '' }), 3000);
                              setShowShareMenu(false);
                            }}
                            className="w-full text-left px-4 py-3 text-sm font-medium text-slate-300 hover:bg-white/5 flex items-center gap-3 border-t border-white/5"
                          >
                            <Copy className="w-4 h-4 text-slate-400" /> Copy Link
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
                <button 
                  onClick={() => setDashboardStatusFilter('Total')}
                  className={`stat-card text-left transition-all ${dashboardStatusFilter === 'Total' ? 'ring-2 ring-indigo-500 bg-indigo-500/10' : 'hover:bg-white/5'}`}
                >
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total</p>
                  <p className="text-3xl font-black text-white">{stats.total}</p>
                </button>
                <button 
                  onClick={() => setDashboardStatusFilter('Applied')}
                  className={`stat-card text-left border-blue-500/20 transition-all ${dashboardStatusFilter === 'Applied' ? 'ring-2 ring-blue-500 bg-blue-500/10' : 'bg-blue-500/5 hover:bg-blue-500/10'}`}
                >
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Applied</p>
                  <p className="text-3xl font-black text-blue-400">{stats.applied}</p>
                </button>
                <button 
                  onClick={() => setDashboardStatusFilter('Screening')}
                  className={`stat-card text-left border-cyan-500/20 transition-all ${dashboardStatusFilter === 'Screening' ? 'ring-2 ring-cyan-500 bg-cyan-500/10' : 'bg-cyan-500/5 hover:bg-cyan-500/10'}`}
                >
                  <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-1">Screening</p>
                  <p className="text-3xl font-black text-cyan-400">{stats.screening}</p>
                </button>
                <button 
                  onClick={() => setDashboardStatusFilter('Interview')}
                  className={`stat-card text-left border-amber-500/20 transition-all ${dashboardStatusFilter === 'Interview' ? 'ring-2 ring-amber-500 bg-amber-500/10' : 'bg-amber-500/5 hover:bg-amber-500/10'}`}
                >
                  <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">Interview</p>
                  <p className="text-3xl font-black text-amber-400">{stats.interviewed}</p>
                </button>
                <button 
                  onClick={() => setDashboardStatusFilter('Offered')}
                  className={`stat-card text-left border-emerald-500/20 transition-all ${dashboardStatusFilter === 'Offered' ? 'ring-2 ring-emerald-500 bg-emerald-500/10' : 'bg-emerald-500/5 hover:bg-emerald-500/10'}`}
                >
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Selected / Offered</p>
                  <p className="text-3xl font-black text-emerald-400">{stats.offered}</p>
                </button>
                <button 
                  onClick={() => setDashboardStatusFilter('Waiting List')}
                  className={`stat-card text-left border-purple-500/20 transition-all ${dashboardStatusFilter === 'Waiting List' ? 'ring-2 ring-purple-500 bg-purple-500/10' : 'bg-purple-500/5 hover:bg-purple-500/10'}`}
                >
                  <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-1">Waiting List</p>
                  <p className="text-3xl font-black text-purple-400">{stats.waitingList}</p>
                </button>
                <button 
                  onClick={() => setDashboardStatusFilter('Rejected')}
                  className={`stat-card text-left border-rose-500/20 transition-all ${dashboardStatusFilter === 'Rejected' ? 'ring-2 ring-rose-500 bg-rose-500/10' : 'bg-rose-500/5 hover:bg-rose-500/10'}`}
                >
                  <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Rejected</p>
                  <p className="text-3xl font-black text-rose-400">{stats.rejected}</p>
                </button>
                <button 
                  onClick={() => setDashboardStatusFilter('Onboarded')}
                  className={`stat-card text-left border-teal-500/20 transition-all ${dashboardStatusFilter === 'Onboarded' ? 'ring-2 ring-teal-500 bg-teal-500/10' : 'bg-teal-500/5 hover:bg-teal-500/10'}`}
                >
                  <p className="text-[10px] font-black text-teal-400 uppercase tracking-widest mb-1">Onboarded</p>
                  <p className="text-3xl font-black text-teal-400">{stats.onboarded}</p>
                </button>
              </div>

              {/* Candidate List */}
              <div className="glass-card overflow-hidden">
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {dashboardStatusFilter === 'Total' ? 'All Candidates' : dashboardStatusFilter === 'Offered' ? 'Selected / Offered Candidates' : `${dashboardStatusFilter} Candidates`}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Showing results for {startDate || endDate ? `${startDate || 'Start'} to ${endDate || 'Today'}` : 'All Time'}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-bold text-slate-400 bg-white/5 px-3 py-1 rounded-lg">
                      {filteredApplicants.filter(app => {
                        if (dashboardStatusFilter === 'Total') return true;
                        return app.status === dashboardStatusFilter;
                      }).length} Records
                    </span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-white/5">
                        <th className="px-4 sm:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Candidate</th>
                        <th className="px-4 sm:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Position / Branch</th>
                        <th className="px-4 sm:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact</th>
                        <th className="px-4 sm:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                        <th className="px-4 sm:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Interview Schedule</th>
                        <th className="px-4 sm:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Score</th>
                        <th className="px-4 sm:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Submitted By</th>
                        <th className="px-4 sm:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                        <th className="px-4 sm:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredApplicants.filter(app => {
                        if (dashboardStatusFilter === 'Total') return true;
                        return app.status === dashboardStatusFilter;
                      }).length > 0 ? filteredApplicants.filter(app => {
                        if (dashboardStatusFilter === 'Total') return true;
                        return app.status === dashboardStatusFilter;
                      }).map((app, i) => (
                        <tr key={app.id || i} className="hover:bg-white/5 transition-colors">
                          <td className="px-4 sm:px-6 py-4">
                            <p className="text-sm font-bold text-white">{app.fullName}</p>
                            <p className="text-xs text-slate-500">{app.experienceType}</p>
                          </td>
                          <td className="px-4 sm:px-6 py-4">
                            <p className="text-sm text-slate-300 font-medium">{app.positionApplied || 'N/A'}</p>
                            <p className="text-xs text-slate-500">{app.branch || 'N/A'} - {app.district || 'N/A'}</p>
                          </td>
                          <td className="px-4 sm:px-6 py-4">
                            <p className="text-sm text-slate-300">{app.mobileNumber}</p>
                            <p className="text-xs text-slate-500">{app.emailId}</p>
                          </td>
                          <td className="px-4 sm:px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              app.status === 'Onboarded' || app.status === 'Offered' ? 'bg-emerald-500/10 text-emerald-500' :
                              app.status === 'Rejected' ? 'bg-rose-500/10 text-rose-500' :
                              app.status === 'Interview' ? 'bg-amber-500/10 text-amber-500' :
                              app.status === 'Waiting List' ? 'bg-purple-500/10 text-purple-500' :
                              'bg-blue-500/10 text-blue-500'
                            }`}>
                              {app.status}
                            </span>
                          </td>
                          <td className="px-4 sm:px-6 py-4">
                            {app.status === 'Interview' && (app.interviewDate || app.interviewTime) ? (
                              <div className="text-xs text-slate-300">
                                <p className="font-bold">{formatDateTime(app.interviewDate, app.interviewTime)}</p>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-600 font-bold">N/A</span>
                            )}
                          </td>
                          <td className="px-4 sm:px-6 py-4">
                            {app.interviewScore ? (
                              <div className="flex items-center gap-1">
                                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                <span className="text-sm font-black text-white">{app.interviewScore}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-600 font-bold">N/A</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs font-bold text-slate-400">{systemUsers.find(u => u.id === app.submittedBy)?.name || 'System'}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs text-slate-500">
                              {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : 'N/A'}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => downloadSingleExcel(app)}
                                className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                                title="Download Full Excel"
                              >
                                <FileSpreadsheet className="w-4 h-4" />
                              </button>
                              {app.resumePath && (
                                <button 
                                  onClick={() => {
                                    setResumeUrl(app.resumePath!);
                                    setViewingFileName(`${app.fullName}_Resume.pdf`);
                                    setViewingFileType('application/pdf');
                                    setViewingFileSize(0);
                                  }}
                                  className="p-2 text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                                  title="View Resume"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              )}
                              {app.resumePath && (
                                <a 
                                  href={app.resumePath}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 text-slate-400 hover:bg-white/5 rounded-lg transition-colors"
                                  title="Open in New Tab"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              )}
                              <button 
                                onClick={() => handleEdit(app)}
                                className="p-2 text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                                title="Edit Candidate"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDelete(app.id)}
                                className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                title="Delete Candidate"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center">
                            <div className="flex flex-col items-center gap-3">
                              <Clock className="w-10 h-10 text-slate-700" />
                              <p className="text-slate-500 font-medium">No candidates found in the system.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : view === 'ANALYTICS' ? (
            /* Analytics View - Visual charts and reports (Admin only) */
            <AnalyticsView applicants={applicants} />
          ) : view === 'REPORTS' ? (
            /* Reports View - For exporting data to Excel/PDF */
            <ReportsView 
              applicants={filteredApplicants} 
              startDate={startDate} 
              endDate={endDate} 
              setStartDate={setStartDate} 
              setEndDate={setEndDate}
              downloadExcel={downloadExcel}
              downloadPDF={downloadPDF}
            />
          ) : view === 'USERS' ? (
            /* Users Management View - For managing HR accounts (Admin only) */
            <UserManagementView users={systemUsers} onRefresh={fetchUsers} />
          ) : view === 'EVALUATION' ? (
            /* Evaluation View - For HRs to review and update candidate status */
            <EvaluationView 
              applicants={filteredApplicants} 
              onRefresh={fetchApplicants} 
              user={user!} 
              setResumeUrl={setResumeUrl}
              setViewingFileName={setViewingFileName}
              setViewingFileType={setViewingFileType}
              setViewingFileSize={setViewingFileSize}
            />
          ) : !isSubmitted ? (
            /* Main Applicant Form - Multi-step form for data entry */
            <>
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-3">
                  <div className="px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-widest">
                    {view === 'PUBLIC_FORM' ? 'Career Portal' : 'Recruitment Management'}
                  </div>
                </div>
                <h2 className="text-4xl font-black text-white tracking-tight leading-tight">
                  {view === 'PUBLIC_FORM' ? (
                    <>Job <span className="gradient-text">Application</span></>
                  ) : (
                    <>Candidate <span className="gradient-text">Registration</span></>
                  )}
                </h2>
                <p className="text-slate-400 mt-2 font-medium">
                  {view === 'PUBLIC_FORM' ? 'Please fill in your professional and personal details.' : 'Please provide the candidate\'s professional and personal details.'}
                </p>
              </div>

              {/* Stepper Component - Shows progress through the form steps */}
              <div className="mb-12 relative px-4">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 -translate-y-1/2 z-0 rounded-full"></div>
                <div 
                  className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-indigo-600 to-cyan-500 -translate-y-1/2 z-0 rounded-full transition-all duration-700"
                  style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
                ></div>
                <div className="relative z-10 flex justify-between">
                  {STEPS.map((step, index) => {
                    const Icon = step.icon;
                    const isActive = index === currentStep;
                    const isCompleted = index < currentStep;
                    
                    return (
                      <div key={step.id} className="step-indicator">
                        <div 
                          className={`step-circle ${
                            isActive ? 'bg-indigo-600 text-white ring-8 ring-indigo-500/10 scale-110' : 
                            isCompleted ? 'bg-emerald-500 text-white' : 'bg-white text-slate-300 border-2 border-slate-100'
                          }`}
                        >
                          {isCompleted ? <CheckCircle2 className="w-7 h-7" /> : <Icon className="w-6 h-6" />}
                        </div>
                        <span className={`mt-4 text-[10px] font-black uppercase tracking-[0.2em] hidden sm:block ${
                          isActive ? 'text-indigo-600' : 'text-slate-400'
                        }`}>
                          {step.title}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="glass-card overflow-hidden">
                <div className="p-8 sm:p-12">
                  {formMessage.text && (
                    <div className={`mb-8 p-4 rounded-xl flex items-center gap-3 ${
                      formMessage.type === 'error' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    }`}>
                      {formMessage.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                      <p className="text-sm font-bold">{formMessage.text}</p>
                    </div>
                  )}
                  <AnimatePresence mode="wait">
                    {currentStep === 0 && (
                      <motion.div
                        key="step0"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-8"
                      >
                        <h3 className="section-title"><User className="w-6 h-6 text-indigo-600" /> Personal Identity</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                          <div>
                            <label className="label-text">Full Legal Name</label>
                            <input 
                              type="text" name="fullName" value={formData.fullName} onChange={handleInputChange}
                              required className="input-field" placeholder="e.g. John Doe"
                            />
                          </div>
                          <div>
                            <label className="label-text">Gender Identity</label>
                            <select 
                              name="gender" value={formData.gender} onChange={handleInputChange}
                              required className="input-field"
                            >
                              <option value="">Select Gender</option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <div>
                            <label className="label-text">Date of Birth</label>
                            <div className="relative">
                              {!formData.dob && <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />}
                              <input 
                                type="date" name="dob" value={formData.dob} onChange={handleInputChange}
                                required className={`input-field ${!formData.dob ? 'pl-16' : 'pl-5'}`}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="label-text">Marital Status</label>
                            <select 
                              name="maritalStatus" value={formData.maritalStatus} onChange={handleInputChange}
                              required className="input-field"
                            >
                              <option value="">Select Status</option>
                              <option value="Single">Single</option>
                              <option value="Married">Married</option>
                              <option value="Divorced">Divorced</option>
                              <option value="Widowed">Widowed</option>
                            </select>
                          </div>
                          <div>
                            <label className="label-text">Blood Group</label>
                            <select 
                              name="bloodGroup" value={formData.bloodGroup} onChange={handleInputChange}
                              required className="input-field"
                            >
                              <option value="">Select Blood Group</option>
                              <optgroup label="Common Types">
                                <option value="A+">A+</option>
                                <option value="A-">A-</option>
                                <option value="A1+">A1+</option>
                                <option value="A1-">A1-</option>
                                <option value="B+">B+</option>
                                <option value="B-">B-</option>
                                <option value="O+">O+</option>
                                <option value="O-">O-</option>
                                <option value="AB+">AB+</option>
                                <option value="AB-">AB-</option>
                              </optgroup>
                              <optgroup label="Rare Types">
                                <option value="Rh-null">Rh-null (Golden Blood)</option>
                                <option value="Bombay Blood Group">Bombay Blood Group (hh)</option>
                                <option value="Lutheran">Lutheran (Lu(a-b-))</option>
                                <option value="Duffy-negative">Duffy-negative</option>
                                <option value="Kidd-negative">Kidd-negative</option>
                                <option value="Vel-negative">Vel-negative</option>
                                <option value="Colton-negative">Colton-negative</option>
                                <option value="Kell-negative">Kell-negative</option>
                                <option value="McLeod Syndrome">McLeod Syndrome</option>
                                <option value="P Null">P Null phenotype</option>
                              </optgroup>
                            </select>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {currentStep === 1 && (
                      <motion.div
                        key="step1"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-8"
                      >
                        <h3 className="section-title"><UsersIcon className="w-6 h-6 text-indigo-600" /> Family Ecosystem</h3>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                          <div className="sm:col-span-2">
                            <h4 className="text-sm font-black text-indigo-400 uppercase tracking-widest mb-4">Parents Details</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 bg-white/5 rounded-3xl border border-white/5">
                              <div>
                                <label className="label-text">Father's Name</label>
                                <input 
                                  type="text" name="fatherName" value={formData.fatherName} onChange={handleInputChange}
                                  required className="input-field" placeholder="Father's Name"
                                />
                              </div>
                              <div>
                                <label className="label-text">Father's Mobile</label>
                                <input 
                                  type="tel" name="fatherMobile" value={formData.fatherMobile} onChange={handleInputChange}
                                  required className="input-field" placeholder="Mobile Number"
                                />
                              </div>
                              <div>
                                <label className="label-text">Father's Education</label>
                                <input 
                                  type="text" name="fatherEducation" value={formData.fatherEducation} onChange={handleInputChange}
                                  required className="input-field" placeholder="Education"
                                />
                              </div>
                              <div>
                                <label className="label-text">Father's Salary (Monthly)</label>
                                <input 
                                  type="text" name="fatherSalary" value={formData.fatherSalary} onChange={handleInputChange}
                                  required className="input-field" placeholder="Salary"
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <label className="label-text">Father's Employment</label>
                                <select 
                                  name="fatherEmployment" value={formData.fatherEmployment} onChange={handleInputChange}
                                  required className="input-field"
                                >
                                  <option value="">Select Employment Status</option>
                                  <option value="Employed">Employed</option>
                                  <option value="Unemployed">Unemployed</option>
                                </select>
                              </div>
                              <div className="sm:col-span-2 h-px bg-white/5 my-2"></div>
                              <div>
                                <label className="label-text">Mother's Name</label>
                                <input 
                                  type="text" name="motherName" value={formData.motherName} onChange={handleInputChange}
                                  required className="input-field" placeholder="Mother's Name"
                                />
                              </div>
                              <div>
                                <label className="label-text">Mother's Mobile</label>
                                <input 
                                  type="tel" name="motherMobile" value={formData.motherMobile} onChange={handleInputChange}
                                  required className="input-field" placeholder="Mobile Number"
                                />
                              </div>
                              <div>
                                <label className="label-text">Mother's Education</label>
                                <input 
                                  type="text" name="motherEducation" value={formData.motherEducation} onChange={handleInputChange}
                                  required className="input-field" placeholder="Education"
                                />
                              </div>
                              <div>
                                <label className="label-text">Mother's Salary (Monthly)</label>
                                <input 
                                  type="text" name="motherSalary" value={formData.motherSalary} onChange={handleInputChange}
                                  required className="input-field" placeholder="Salary"
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <label className="label-text">Mother's Employment</label>
                                <select 
                                  name="motherEmployment" value={formData.motherEmployment} onChange={handleInputChange}
                                  required className="input-field"
                                >
                                  <option value="">Select Employment Status</option>
                                  <option value="Employed">Employed</option>
                                  <option value="Unemployed">Unemployed</option>
                                </select>
                              </div>
                            </div>
                          </div>

                          {formData.maritalStatus === 'Married' && (
                            <div className="sm:col-span-2">
                              <h4 className="text-sm font-black text-indigo-400 uppercase tracking-widest mb-4">Spouse Details</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 bg-white/5 rounded-3xl border border-white/5">
                                <div>
                                  <label className="label-text">Spouse Name</label>
                                  <input 
                                    type="text" name="spouseName" value={formData.spouseName} onChange={handleInputChange}
                                    required className="input-field" placeholder="Spouse Name"
                                  />
                                </div>
                                <div>
                                  <label className="label-text">Spouse Mobile</label>
                                  <input 
                                    type="tel" name="spouseMobile" value={formData.spouseMobile} onChange={handleInputChange}
                                    required className="input-field" placeholder="Mobile Number"
                                  />
                                </div>
                                <div>
                                  <label className="label-text">Spouse Education</label>
                                  <input 
                                    type="text" name="spouseEducation" value={formData.spouseEducation} onChange={handleInputChange}
                                    required className="input-field" placeholder="Education"
                                  />
                                </div>
                                <div>
                                  <label className="label-text">Spouse Salary (Monthly)</label>
                                  <input 
                                    type="text" name="spouseSalary" value={formData.spouseSalary} onChange={handleInputChange}
                                    required className="input-field" placeholder="Salary"
                                  />
                                </div>
                                <div className="sm:col-span-2">
                                  <label className="label-text">Spouse Employment</label>
                                  <select 
                                    name="spouseEmployment" value={formData.spouseEmployment} onChange={handleInputChange}
                                    required className="input-field"
                                  >
                                    <option value="">Select Employment Status</option>
                                    <option value="Employed">Employed</option>
                                    <option value="Unemployed">Unemployed</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Kids Details */}
                        {['Married', 'Divorced', 'Widowed'].includes(formData.maritalStatus) && (
                          <div className="space-y-6 pt-6 border-t border-white/5">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-black text-indigo-400 uppercase tracking-widest">Children Details</h4>
                              <div className="flex items-center gap-3">
                                <label className="text-xs font-bold text-slate-500">No. of Kids:</label>
                                <input 
                                  type="number" min="0" 
                                  value={formData.numberOfKids} 
                                  onChange={(e) => updateKidsCount(parseInt(e.target.value) || 0)}
                                  className="w-16 px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-white text-center font-bold"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                              {formData.kidsDetails.map((kid, idx) => (
                                <div key={idx} className="p-4 bg-white/5 rounded-2xl border border-white/5 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                  <div>
                                    <label className="label-text text-[10px]">Kid {idx + 1} Name</label>
                                    <input 
                                      type="text" value={kid.name} 
                                      onChange={(e) => handleKidChange(idx, 'name', e.target.value)}
                                      className="input-field py-2 text-sm" placeholder="Name"
                                    />
                                  </div>
                                  <div>
                                    <label className="label-text text-[10px]">Age</label>
                                    <input 
                                      type="text" value={kid.age} 
                                      onChange={(e) => handleKidChange(idx, 'age', e.target.value)}
                                      className="input-field py-2 text-sm" placeholder="Age"
                                    />
                                  </div>
                                  <div>
                                    <label className="label-text text-[10px]">Education</label>
                                    <input 
                                      type="text" value={kid.education} 
                                      onChange={(e) => handleKidChange(idx, 'education', e.target.value)}
                                      className="input-field py-2 text-sm" placeholder="School/College"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Sibling Details */}
                        <div className="space-y-6 pt-6 border-t border-white/5">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-black text-indigo-400 uppercase tracking-widest">Siblings Details</h4>
                            <div className="flex items-center gap-3">
                              <label className="text-xs font-bold text-slate-500">No. of Siblings:</label>
                              <input 
                                type="number" min="0" 
                                value={formData.numberOfSiblings} 
                                onChange={(e) => updateSiblingsCount(parseInt(e.target.value) || 0)}
                                className="w-16 px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-white text-center font-bold"
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 gap-6">
                            {formData.siblingsDetails.map((sib, idx) => (
                              <div key={idx} className="p-6 bg-white/5 rounded-3xl border border-white/5 space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-widest">Sibling {idx + 1}</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div>
                                    <label className="label-text text-[10px]">Full Name</label>
                                    <input 
                                      type="text" value={sib.name} 
                                      onChange={(e) => handleSiblingChange(idx, 'name', e.target.value)}
                                      className="input-field py-2 text-sm" placeholder="Name"
                                    />
                                  </div>
                                  <div>
                                    <label className="label-text text-[10px]">Age</label>
                                    <input 
                                      type="text" value={sib.age} 
                                      onChange={(e) => handleSiblingChange(idx, 'age', e.target.value)}
                                      className="input-field py-2 text-sm" placeholder="Age"
                                    />
                                  </div>
                                  <div>
                                    <label className="label-text text-[10px]">Gender</label>
                                    <select 
                                      value={sib.gender} 
                                      onChange={(e) => handleSiblingChange(idx, 'gender', e.target.value)}
                                      className="input-field py-2 text-sm"
                                    >
                                      <option value="">Select Gender</option>
                                      <option value="Male">Male</option>
                                      <option value="Female">Female</option>
                                      <option value="Other">Other</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="label-text text-[10px]">Education</label>
                                    <input 
                                      type="text" value={sib.education} 
                                      onChange={(e) => handleSiblingChange(idx, 'education', e.target.value)}
                                      className="input-field py-2 text-sm" placeholder="e.g. B.E Computer Science"
                                    />
                                  </div>
                                  <div className="sm:col-span-2">
                                    <label className="label-text text-[10px]">Current Location</label>
                                    <input 
                                      type="text" value={sib.location} 
                                      onChange={(e) => handleSiblingChange(idx, 'location', e.target.value)}
                                      className="input-field py-2 text-sm" placeholder="City"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {currentStep === 2 && (
                      <motion.div
                        key="step1"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-8"
                      >
                        <h3 className="section-title"><MapPin className="w-6 h-6 text-indigo-600" /> Communication Hub</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                          <div>
                            <label className="label-text">Mobile Number</label>
                            <div className="relative">
                              {!formData.mobileNumber && <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />}
                              <input 
                                type="tel" name="mobileNumber" value={formData.mobileNumber} onChange={handleInputChange}
                                required className={`input-field ${!formData.mobileNumber ? 'pl-16' : 'pl-5'} ${mobileError ? 'border-rose-500 bg-rose-500/5' : ''}`} placeholder="+91 98765 43210"
                                maxLength={10}
                              />
                            </div>
                            {mobileError && (
                              <p className="mt-2 text-xs font-bold text-rose-500 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> {mobileError}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="label-text">Primary Email</label>
                            <div className="relative">
                              {!formData.emailId && <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />}
                              <input 
                                type="email" name="emailId" value={formData.emailId} onChange={handleInputChange}
                                required className={`input-field ${!formData.emailId ? 'pl-16' : 'pl-5'}`} placeholder="john@example.com"
                              />
                            </div>
                          </div>
                          <div className="sm:col-span-2">
                            <label className="label-text">Permanent Address</label>
                            <textarea 
                              name="permanentAddress" value={formData.permanentAddress} onChange={handleInputChange}
                              required className="input-field min-h-[120px] resize-none" placeholder="Full address with landmarks..."
                            />
                          </div>
                          <div>
                            <label className="label-text">City</label>
                            <input 
                              type="text" name="city" value={formData.city} onChange={handleInputChange}
                              required className="input-field" placeholder="e.g. Chennai"
                            />
                          </div>
                          <div>
                            <label className="label-text">Pincode</label>
                            <input 
                              type="text" name="pincode" value={formData.pincode} onChange={handleInputChange}
                              required className="input-field" placeholder="600001"
                            />
                          </div>
                        </div>

                        <div className="pt-8 border-t border-white/5">
                          <div className="flex items-center gap-5 mb-6">
                            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
                              <AlertCircle className="w-5 h-5 text-amber-500" />
                            </div>
                            <h4 className="text-lg font-extrabold text-white">Emergency Contact</h4>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                            <div>
                              <label className="label-text">Contact Person Name</label>
                              <input 
                                type="text" name="emergencyContactName" value={formData.emergencyContactName} onChange={handleInputChange}
                                required className="input-field" placeholder="Relative or Friend"
                              />
                            </div>
                            <div>
                              <label className="label-text">Emergency Phone</label>
                              <input 
                                type="tel" name="emergencyContactNumber" value={formData.emergencyContactNumber} onChange={handleInputChange}
                                required className="input-field" placeholder="Active mobile number"
                              />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {currentStep === 3 && (
                      <motion.div
                        key="step3"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-8"
                      >
                        <h3 className="section-title"><ShieldCheck className="w-6 h-6 text-indigo-600" /> Statutory Compliance</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                          <div>
                            <label className="label-text">Aadhaar Number</label>
                            <input 
                              type="text" name="aadhaarNumber" value={formData.aadhaarNumber} onChange={handleInputChange}
                              required className={`input-field font-mono tracking-widest ${aadhaarError ? 'border-rose-500 bg-rose-500/5' : ''}`} placeholder="XXXX XXXX XXXX"
                            />
                            {aadhaarError && (
                              <p className="mt-2 text-xs font-bold text-rose-500 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> {aadhaarError}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="label-text">PAN Card Number</label>
                            <input 
                              type="text" name="panNumber" value={formData.panNumber} onChange={handleInputChange}
                              required className="input-field font-mono uppercase tracking-widest" placeholder="ABCDE1234F"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="label-text">Driving Licence Number</label>
                            <div className="relative">
                              {!formData.drivingLicenceNumber && <Car className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />}
                              <input 
                                type="text" name="drivingLicenceNumber" value={formData.drivingLicenceNumber} onChange={handleInputChange}
                                required className={`input-field ${!formData.drivingLicenceNumber ? 'pl-16' : 'pl-5'} font-mono uppercase`} placeholder="TN XX XXXX XXXXXXX"
                              />
                            </div>
                          </div>
                        </div>
                        
                        <div className="p-6 bg-indigo-50/50 border border-indigo-100 rounded-3xl flex gap-5">
                          <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center shrink-0">
                            <BadgeCheck className="w-6 h-6 text-indigo-600" />
                          </div>
                          <div>
                            <p className="text-base font-extrabold text-indigo-900">Enterprise Security Standard</p>
                            <p className="text-sm text-indigo-700/80 mt-1 font-medium leading-relaxed">
                              All identity data is processed through our secure vault. We comply with GDPR and local data protection laws.
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {currentStep === 4 && (
                      <motion.div
                        key="step4"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-8"
                      >
                        <h3 className="section-title"><Briefcase className="w-6 h-6 text-indigo-600" /> Professional Trajectory</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                          <div>
                            <label className="label-text">Experience Level</label>
                            <select 
                              name="experienceType" value={formData.experienceType} onChange={handleInputChange}
                              required className="input-field"
                            >
                              <option value="">Select Level</option>
                              <option value="Fresher">Fresher</option>
                              <option value="Experience">Experienced Professional</option>
                            </select>
                          </div>
                          <div>
                            <label className="label-text">Degree Type</label>
                            <select 
                              name="degreeType" value={formData.degreeType} onChange={handleInputChange}
                              required className="input-field"
                            >
                              <option value="">Select Degree</option>
                              <option value="Bachelors">Bachelors</option>
                              <option value="Masters">Masters</option>
                              <option value="Doctorate">Doctorate</option>
                              <option value="Diploma">Diploma</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <div>
                            <label className="label-text">Position Applied For</label>
                            <input 
                              type="text" name="positionApplied" value={formData.positionApplied} onChange={handleInputChange}
                              required className="input-field" placeholder="e.g. Software Engineer"
                            />
                          </div>
                          <div>
                            <label className="label-text">Branch Location</label>
                            <input 
                              type="text" name="branch" value={formData.branch} onChange={handleInputChange}
                              required className="input-field" placeholder="e.g. Main Branch"
                            />
                          </div>
                          <div>
                            <label className="label-text">District / Location</label>
                            <input 
                              type="text" name="district" value={formData.district} onChange={handleInputChange}
                              required className="input-field" placeholder="e.g. Chennai"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="label-text">Institute/College Name</label>
                            <input 
                              type="text" name="instituteName" value={formData.instituteName} onChange={handleInputChange}
                              required className="input-field" placeholder="Enter College/University Name"
                            />
                          </div>

                          {formData.experienceType === 'Fresher' && (
                            <>
                              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                                <label className="label-text">Education Details (Degree/Course)</label>
                                <input 
                                  type="text" name="educationDetails" value={formData.educationDetails} onChange={handleInputChange}
                                  required className="input-field" placeholder="e.g. B.E Computer Science"
                                />
                              </motion.div>
                              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                                <label className="label-text">Passed Out Year</label>
                                <input 
                                  type="text" name="passedOutYear" value={formData.passedOutYear} onChange={handleInputChange}
                                  required className="input-field" placeholder="e.g. 2023"
                                />
                              </motion.div>
                            </>
                          )}

                          {formData.experienceType === 'Experience' && (
                            <div className="sm:col-span-2 space-y-8">
                              <div className="flex items-center justify-between">
                                <label className="label-text">Number of Previous Companies</label>
                                <input 
                                  type="number" min="0" 
                                  value={formData.numberOfCompanies} 
                                  onChange={(e) => updateExperienceCount(parseInt(e.target.value) || 0)}
                                  className="w-20 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-center font-bold"
                                />
                              </div>

                              <div className="grid grid-cols-1 gap-6">
                                {formData.experienceDetails.map((exp, idx) => (
                                  <div key={idx} className="p-6 bg-white/5 rounded-3xl border border-white/5 space-y-4">
                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Company {idx + 1}</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                      <div>
                                        <label className="label-text text-[10px]">Company Name</label>
                                        <input 
                                          type="text" value={exp.companyName} 
                                          onChange={(e) => handleExperienceChange(idx, 'companyName', e.target.value)}
                                          className="input-field py-2 text-sm" placeholder="Company Name"
                                        />
                                      </div>
                                      <div>
                                        <label className="label-text text-[10px]">Role/Designation</label>
                                        <input 
                                          type="text" value={exp.role} 
                                          onChange={(e) => handleExperienceChange(idx, 'role', e.target.value)}
                                          className="input-field py-2 text-sm" placeholder="Role"
                                        />
                                      </div>
                                      <div>
                                        <label className="label-text text-[10px]">Salary (LPA)</label>
                                        <input 
                                          type="text" value={exp.salary} 
                                          onChange={(e) => handleExperienceChange(idx, 'salary', e.target.value)}
                                          className="input-field py-2 text-sm" placeholder="Salary"
                                        />
                                      </div>
                                      <div>
                                        <label className="label-text text-[10px]">Years of Work (e.g. 2020-2022)</label>
                                        <input 
                                          type="text" value={exp.yearsOfWork} 
                                          onChange={(e) => handleExperienceChange(idx, 'yearsOfWork', e.target.value)}
                                          className="input-field py-2 text-sm" placeholder="Years"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4 border-t border-white/5">
                                <div>
                                  <label className="label-text">Current Annual CTC (LPA)</label>
                                  <input 
                                    type="text" name="currentSalary" value={formData.currentSalary} onChange={handleInputChange}
                                    required className="input-field" placeholder="e.g. 12.5"
                                  />
                                </div>
                                <div>
                                  <label className="label-text">Expected Annual CTC (LPA)</label>
                                  <input 
                                    type="text" name="expectedSalary" value={formData.expectedSalary} onChange={handleInputChange}
                                    required className="input-field" placeholder="e.g. 15.0"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {formData.experienceType === 'Fresher' && (
                            <div>
                              <label className="label-text">Expected Annual CTC (LPA)</label>
                              <input 
                                type="text" name="expectedSalary" value={formData.expectedSalary} onChange={handleInputChange}
                                required className="input-field" placeholder="e.g. 15.0"
                              />
                            </div>
                          )}

                          <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-8">
                            <div>
                              <label className="label-text">Application Source</label>
                              <select 
                                name="sourceOfApplication" value={formData.sourceOfApplication} onChange={handleInputChange}
                                required className="input-field"
                              >
                                <option value="">Select Source</option>
                                <option value="LinkedIn">LinkedIn</option>
                                <option value="Indeed">Indeed</option>
                                <option value="Company Website">Company Website</option>
                                <option value="Referral">Employee Referral</option>
                                <option value="Walk-in">Direct Walk-in</option>
                                <option value="Other">Other Channels</option>
                              </select>
                            </div>
                            <div>
                              <label className="label-text">Source Remarks</label>
                              <input 
                                type="text" name="sourceRemark" value={formData.sourceRemark} onChange={handleInputChange}
                                className="input-field" placeholder="Additional details"
                              />
                            </div>
                          </div>

                          {formData.sourceOfApplication === 'Referral' && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 bg-white/5 rounded-3xl border border-white/5"
                            >
                              <div>
                                <label className="label-text">Referer Name</label>
                                <input 
                                  type="text" name="refererName" value={formData.refererName} onChange={handleInputChange}
                                  className="input-field" placeholder="Full Name"
                                />
                              </div>
                              <div>
                                <label className="label-text">Referer Employee ID</label>
                                <input 
                                  type="text" name="refererEmpId" value={formData.refererEmpId} onChange={handleInputChange}
                                  className="input-field" placeholder="Emp ID"
                                />
                              </div>
                              <div>
                                <label className="label-text">Referer Branch</label>
                                <input 
                                  type="text" name="refererBranch" value={formData.refererBranch} onChange={handleInputChange}
                                  className="input-field" placeholder="Branch Location"
                                />
                              </div>
                              <div>
                                <label className="label-text">Referer Mobile</label>
                                <input 
                                  type="tel" name="refererMobile" value={formData.refererMobile} onChange={handleInputChange}
                                  className="input-field" placeholder="Mobile Number"
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <label className="label-text">Referer Designation</label>
                                <input 
                                  type="text" name="refererDesignation" value={formData.refererDesignation} onChange={handleInputChange}
                                  className="input-field" placeholder="Job Title"
                                />
                              </div>
                            </motion.div>
                          )}

                          <div className="sm:col-span-2">
                            <label className="label-text">Resume Portfolio</label>
                            <div 
                              onClick={() => fileInputRef.current?.click()}
                              className="border-2 border-dashed border-white/10 rounded-3xl p-12 text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-500/5 transition-all group"
                            >
                              <input 
                                type="file" ref={fileInputRef} onChange={handleFileChange}
                                className="hidden" accept=".pdf,.doc,.docx"
                              />
                              <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-indigo-500/10 transition-colors">
                                <Upload className="w-8 h-8 text-slate-500 group-hover:text-indigo-400" />
                              </div>
                              <p className="text-lg font-extrabold text-white">
                                {viewingResume ? viewingResume.name : (formData.resumePath ? 'Resume Uploaded' : 'Upload Professional Resume')}
                              </p>
                              <p className="text-sm text-slate-500 mt-2 font-medium">PDF or DOCX format (Max 10MB)</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                    {currentStep === 5 && (
                      <motion.div
                        key="step5"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-8"
                      >
                        <h3 className="section-title"><ClipboardCheck className="w-6 h-6 text-indigo-600" /> Interview & Evaluation</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                          <div>
                            <label className="label-text">Interview Score (0-10)</label>
                            <input 
                              type="number" step="0.1" min="0" max="10"
                              name="interviewScore" value={formData.interviewScore} onChange={handleInputChange}
                              className="input-field" placeholder="e.g. 8.5"
                            />
                          </div>
                          <div>
                            <label className="label-text">Candidate Status</label>
                            <select 
                              name="status" value={formData.status} onChange={handleInputChange}
                              required className="input-field"
                            >
                              <option value="Applied">Applied</option>
                              <option value="Screening">Screening</option>
                              <option value="Interview">Interview</option>
                              <option value="Offered">Offered</option>
                              <option value="Rejected">Rejected</option>
                              <option value="Onboarded">Onboarded</option>
                            </select>
                          </div>
                          <div className="sm:col-span-2">
                            <label className="label-text">Interview Remarks</label>
                            <textarea 
                              name="interviewRemarks" value={formData.interviewRemarks} onChange={handleInputChange}
                              className="input-field min-h-[120px] resize-none" placeholder="Detailed feedback about the candidate..."
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="px-8 sm:px-12 py-8 bg-white/5 border-t border-white/5 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={prevStep}
                    disabled={currentStep === 0}
                    className="btn-secondary disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" /> Back
                  </button>

                  {currentStep === STEPS.length - 1 ? (
                    <button type="submit" className="btn-primary">
                      {view === 'PUBLIC_FORM' ? 'Submit Application' : 'Complete Onboarding'} <CheckCircle2 className="w-5 h-5" />
                    </button>
                  ) : (
                    <button type="button" onClick={nextStep} className="btn-primary">
                      Continue <ChevronRight className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </form>
            </>
          ) : (
            /* Success Screen - Shown after form submission is complete */
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-16 text-center"
            >
              <div className="w-24 h-24 bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-emerald-900/20">
                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
              </div>
              <h2 className="text-4xl font-black text-white mb-4 tracking-tight">Success!</h2>
              <p className="text-lg text-slate-400 font-medium mb-12 max-w-md mx-auto">
                {view === 'PUBLIC_FORM' ? (
                  <>Thank you for your application, <span className="text-indigo-400 font-bold">{formData.fullName}</span>. We will review it and get back to you.</>
                ) : (
                  <>Application for <span className="text-indigo-400 font-bold">{formData.fullName}</span> has been successfully logged into the system.</>
                )}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {view !== 'PUBLIC_FORM' && (
                  <>
                    <button 
                      onClick={() => {
                        setFormData(INITIAL_DATA);
                        setEditingId(null);
                        setCurrentStep(0);
                        setIsSubmitted(false);
                        setViewingResume(null);
                        setView('FORM');
                      }}
                      className="btn-primary"
                    >
                      New Application
                    </button>
                    <button 
                      onClick={() => setView('DASHBOARD')}
                      className="btn-secondary"
                    >
                      Back to Dashboard
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </main>

      {/* Resume Viewer Modal - Displays uploaded resumes in an overlay */}
      <AnimatePresence>
        {resumeUrl && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setResumeUrl(null);
              }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-5xl h-[90vh] bg-[#1a1b1e] rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center">
                    <FileText className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white leading-tight">{viewingFileName}</h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {viewingFileSize > 0 ? `${(viewingFileSize / (1024 * 1024)).toFixed(2)} MB • ` : ''}
                      {viewingFileType}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a 
                    href={resumeUrl} 
                    download={viewingFileName}
                    className="p-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all"
                    title="Download Resume"
                  >
                    <Download className="w-5 h-5" />
                  </a>
                  <button 
                    onClick={() => {
                      setResumeUrl(null);
                    }}
                    className="p-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-black/20 p-4 overflow-hidden">
                {viewingFileType === 'application/pdf' ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-center p-12 bg-white/5 rounded-2xl">
                    <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center mb-6">
                      <FileText className="w-10 h-10 text-indigo-400" />
                    </div>
                    <h4 className="text-xl font-bold text-white mb-2">PDF Preview</h4>
                    <p className="text-slate-400 max-w-xs mb-8">For security reasons, some browsers block PDF previews in embedded views. Please open the file in a new tab to view it.</p>
                    <div className="flex gap-4">
                      <a 
                        href={resumeUrl} 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary"
                      >
                        <Eye className="w-5 h-5" /> View in New Tab
                      </a>
                      <a 
                        href={resumeUrl} 
                        download={viewingFileName}
                        className="px-6 py-3 bg-white/5 text-white rounded-2xl font-bold hover:bg-white/10 transition-all flex items-center gap-2"
                      >
                        <Download className="w-5 h-5" /> Download
                      </a>
                    </div>
                  </div>
                ) : viewingFileType.startsWith('image/') ? (
                  <div className="w-full h-full overflow-auto flex items-center justify-center">
                    <img src={resumeUrl} alt="Resume" className="max-w-full rounded-xl shadow-lg" />
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-center p-12">
                    <div className="w-20 h-20 bg-amber-500/10 rounded-3xl flex items-center justify-center mb-6">
                      <AlertCircle className="w-10 h-10 text-amber-500" />
                    </div>
                    <h4 className="text-xl font-bold text-white mb-2">Preview Not Available</h4>
                    <p className="text-slate-400 max-w-xs mb-8">This file type cannot be previewed directly in the browser. Please download it to view.</p>
                    <a 
                      href={resumeUrl} 
                      download={viewingFileName}
                      className="btn-primary"
                    >
                      <Download className="w-5 h-5" /> Download File
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Evaluation View Component - Allows HR to review candidates, update scores, and change status
function EvaluationView({ 
  applicants, 
  onRefresh, 
  user,
  setResumeUrl,
  setViewingFileName,
  setViewingFileType,
  setViewingFileSize
}: { 
  applicants: ApplicantData[], 
  onRefresh: () => void, 
  user: UserProfile,
  setResumeUrl: (url: string | null) => void,
  setViewingFileName: (name: string) => void,
  setViewingFileType: (type: string) => void,
  setViewingFileSize: (size: number) => void
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApplicant, setSelectedApplicant] = useState<ApplicantData | null>(null);
  const [score, setScore] = useState('');
  const [remarks, setRemarks] = useState('');
  const [status, setStatus] = useState<ApplicantStatus>('Interview');
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [activeTab, setActiveTab] = useState<'EVAL' | 'PROFILE'>('EVAL');

  // Detailed scores
  const [techScore, setTechScore] = useState(0);
  const [commScore, setCommScore] = useState(0);
  const [fitScore, setFitScore] = useState(0);

  // Interview Scheduling
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('');
  const [interviewLocation, setInterviewLocation] = useState('');

  // Calculate average score when detailed scores change
  useEffect(() => {
    if (techScore > 0 || commScore > 0 || fitScore > 0) {
      const activeScores = [techScore, commScore, fitScore].filter(s => s > 0);
      const avg = activeScores.reduce((a, b) => a + b, 0) / activeScores.length;
      setScore(avg.toFixed(1));
    }
  }, [techScore, commScore, fitScore]);

  const filtered = applicants.filter(a => {
    const matchesSearch = a.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         a.mobileNumber.includes(searchTerm);
    
    if (user.role === 'ADMIN') return matchesSearch;
    return matchesSearch && a.submittedBy === user.id;
  });

  const handleSelect = (app: ApplicantData) => {
    setSelectedApplicant(app);
    setScore(app.interviewScore || '');
    setRemarks(app.interviewRemarks || '');
    setStatus(app.status || 'Interview');
    setMessage({ text: '', type: '' });
    setActiveTab('EVAL');
    setTechScore(app.techScore || 0);
    setCommScore(app.commScore || 0);
    setFitScore(app.fitScore || 0);
    setInterviewDate(app.interviewDate || '');
    setInterviewTime(app.interviewTime || '');
    setInterviewLocation(app.interviewLocation || '');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApplicant) return;

    setIsUpdating(true);
    try {
      const timestamp = new Date().toISOString();
      const detailedScores = techScore > 0 ? `\n\n[Detailed Scores]\nTechnical: ${techScore}/10\nCommunication: ${commScore}/10\nCultural Fit: ${fitScore}/10` : '';
      const trackingInfo = `\n\n[Evaluation Update]\nStatus: ${status}\nUpdated By: ${user.name}\nDate: ${timestamp}`;
      
      const finalRemarks = remarks + detailedScores + trackingInfo;
      
      const response = await fetch(`/api/applicants/${selectedApplicant.id}/evaluation`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          interviewScore: score, 
          interviewRemarks: finalRemarks, 
          status,
          techScore,
          commScore,
          fitScore,
          interviewDate,
          interviewTime,
          interviewLocation
        }),
      });

      if (response.ok) {
        setMessage({ text: 'Evaluation updated successfully!', type: 'success' });
        onRefresh();
      } else {
        setMessage({ text: 'Failed to update evaluation.', type: 'error' });
      }
    } catch (error) {
      setMessage({ text: 'An error occurred.', type: 'error' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSendWhatsApp = () => {
    if (!selectedApplicant) return;
    
    // Convert 24h time to 12h format
    const [hours, minutes] = interviewTime.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    const formattedTime = `${h12}:${minutes} ${ampm}`;

    const message = `Dear ${selectedApplicant.fullName},%0A%0AWe are pleased to invite you for an interview for the ${selectedApplicant.positionApplied || selectedApplicant.experienceType} position at Jailaxmi Group.%0A%0A*Date:* ${interviewDate}%0A*Time:* ${formattedTime}%0A*Location/Link:* ${interviewLocation}%0A%0APlease confirm your availability.%0A%0ABest regards,%0AHR Team, Jailaxmi Group`;
    window.open(`https://wa.me/91${selectedApplicant.mobileNumber}?text=${message}`, '_blank');
  };

  const handleSendEmail = () => {
    if (!selectedApplicant) return;
    const subject = `Interview Invitation - Jailaxmi Group`;
    const body = `Dear ${selectedApplicant.fullName},\n\nWe are pleased to invite you for an interview for the ${selectedApplicant.positionApplied || selectedApplicant.experienceType} position at Jailaxmi Group.\n\nDate: ${interviewDate}\nTime: ${interviewTime}\nLocation/Link: ${interviewLocation}\n\nPlease confirm your availability.\n\nBest regards,\nHR Team, Jailaxmi Group`;
    window.open(`mailto:${selectedApplicant.emailId}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">Interview Evaluation</h2>
          <p className="text-slate-400 mt-1 font-medium">Search and update candidate performance</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="px-6 py-3 bg-white/5 rounded-2xl border border-white/5 text-center">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Avg Score</p>
            <p className="text-xl font-black text-indigo-400">
              {filtered.filter(a => a.interviewScore).length > 0 
                ? (filtered.reduce((acc, a) => acc + parseFloat(a.interviewScore || '0'), 0) / filtered.filter(a => a.interviewScore).length).toFixed(1)
                : '0.0'}
            </p>
          </div>
          <div className="px-6 py-3 bg-white/5 rounded-2xl border border-white/5 text-center">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Evaluated</p>
            <p className="text-xl font-black text-white">
              {filtered.filter(a => a.interviewScore).length} / {filtered.length}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Search Section */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card p-6">
            <label className="label-text mb-3 block">Search Candidate</label>
            <div className="relative">
              <input 
                type="text" 
                className="input-field pl-12" 
                placeholder="Name or Mobile Number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <UsersIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            </div>
          </div>

          <div className="glass-card overflow-hidden max-h-[600px] flex flex-col">
            <div className="p-4 border-b border-white/5 bg-white/5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Search Results ({filtered.length})</p>
            </div>
            <div className="divide-y divide-white/5 overflow-y-auto">
              {filtered.map(app => (
                <button 
                  key={app.id}
                  onClick={() => handleSelect(app)}
                  className={`w-full text-left p-4 hover:bg-white/5 transition-all flex items-center gap-4 ${selectedApplicant?.id === app.id ? 'bg-indigo-500/10 border-l-4 border-indigo-500' : ''}`}
                >
                  <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center font-black text-indigo-400 shrink-0">
                    {app.fullName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{app.fullName}</p>
                    <p className="text-xs text-slate-500 truncate">{app.positionApplied || app.experienceType}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </div>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="p-8 text-center">
                  <p className="text-xs text-slate-500 font-medium">No candidates found.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Evaluation Form Section */}
        <div className="lg:col-span-2">
          {selectedApplicant ? (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-card overflow-hidden"
            >
              {/* Header */}
              <div className="p-8 border-b border-white/5 bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-2xl flex items-center justify-center font-black text-white text-2xl shadow-xl">
                    {selectedApplicant.fullName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white tracking-tight">{selectedApplicant.fullName}</h3>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">{selectedApplicant.positionApplied || selectedApplicant.experienceType}</span>
                      <span className="w-1 h-1 bg-slate-700 rounded-full" />
                      <span className="text-xs font-bold text-slate-500">{selectedApplicant.branch} ({selectedApplicant.district})</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                    selectedApplicant.status === 'Onboarded' || selectedApplicant.status === 'Offered' ? 'bg-emerald-500/10 text-emerald-500' :
                    selectedApplicant.status === 'Rejected' ? 'bg-rose-500/10 text-rose-500' :
                    selectedApplicant.status === 'Interview' ? 'bg-amber-500/10 text-amber-500' :
                    selectedApplicant.status === 'Waiting List' ? 'bg-purple-500/10 text-purple-500' :
                    'bg-blue-500/10 text-blue-500'
                  }`}>
                    {selectedApplicant.status}
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-white/5">
                <button 
                  onClick={() => setActiveTab('EVAL')}
                  className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'EVAL' ? 'text-indigo-400 border-b-2 border-indigo-400 bg-indigo-400/5' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Evaluation Form
                </button>
                <button 
                  onClick={() => setActiveTab('PROFILE')}
                  className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'PROFILE' ? 'text-indigo-400 border-b-2 border-indigo-400 bg-indigo-400/5' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Candidate Profile
                </button>
              </div>

              <div className="p-10">
                {activeTab === 'EVAL' ? (
                  <form onSubmit={handleUpdate} className="space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      {/* Detailed Scoring */}
                      <div className="space-y-6">
                        <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Performance Metrics</h4>
                        
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between mb-2">
                              <label className="text-xs font-bold text-slate-300">Technical Skills</label>
                              <span className="text-xs font-black text-indigo-400">{techScore}/10</span>
                            </div>
                            <input 
                              type="range" min="0" max="10" step="0.5"
                              className="w-full accent-indigo-500"
                              value={techScore}
                              onChange={(e) => setTechScore(parseFloat(e.target.value))}
                            />
                          </div>
                          
                          <div>
                            <div className="flex justify-between mb-2">
                              <label className="text-xs font-bold text-slate-300">Communication</label>
                              <span className="text-xs font-black text-indigo-400">{commScore}/10</span>
                            </div>
                            <input 
                              type="range" min="0" max="10" step="0.5"
                              className="w-full accent-indigo-500"
                              value={commScore}
                              onChange={(e) => setCommScore(parseFloat(e.target.value))}
                            />
                          </div>

                          <div>
                            <div className="flex justify-between mb-2">
                              <label className="text-xs font-bold text-slate-300">Cultural Fit</label>
                              <span className="text-xs font-black text-indigo-400">{fitScore}/10</span>
                            </div>
                            <input 
                              type="range" min="0" max="10" step="0.5"
                              className="w-full accent-indigo-500"
                              value={fitScore}
                              onChange={(e) => setFitScore(parseFloat(e.target.value))}
                            />
                          </div>
                        </div>

                        <div className="pt-6 border-t border-white/5">
                          <label className="label-text">Final Interview Score (1-10)</label>
                          <input 
                            type="number" min="0" max="10" step="0.1"
                            className="input-field text-xl font-black text-indigo-400" 
                            placeholder="e.g. 8.5"
                            value={score}
                            onChange={(e) => setScore(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      {/* Status & Remarks */}
                      <div className="space-y-6">
                        <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Decision & Feedback</h4>
                        
                        <div>
                          <label className="label-text">Update Status</label>
                          <select 
                            className="input-field"
                            value={status}
                            onChange={(e) => setStatus(e.target.value as ApplicantStatus)}
                            required
                          >
                            <option value="Applied">Applied</option>
                            <option value="Screening">Screening</option>
                            <option value="Interview">Interview</option>
                            <option value="Offered">Selected / Offered</option>
                            <option value="Waiting List">Waiting List</option>
                            <option value="Rejected">Rejected</option>
                            <option value="Onboarded">Onboarded</option>
                          </select>
                        </div>

                        <div>
                          <label className="label-text">Interview Remarks</label>
                          <textarea 
                            className="input-field min-h-[200px] resize-none py-4" 
                            placeholder="Detailed feedback about the candidate's performance..."
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      {/* Interview Scheduling */}
                      {status === 'Interview' && (
                        <div className="space-y-6 pt-6 border-t border-white/5">
                          <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <Calendar className="w-4 h-4" /> Interview Scheduling
                          </h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="label-text">Interview Date (DD-MM-YYYY)</label>
                              <div className="relative">
                                {!interviewDate && <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />}
                                <input 
                                  type="date" 
                                  className={`input-field w-full text-lg p-4 ${!interviewDate ? 'pl-16' : 'pl-5'}`}
                                  value={interviewDate}
                                  onChange={(e) => setInterviewDate(e.target.value)}
                                />
                              </div>
                            </div>
                            <div>
                              <label className="label-text">Interview Time (12-hour format)</label>
                              <div className="relative">
                                {!interviewTime && <Clock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />}
                                <input 
                                  type="time" 
                                  className={`input-field w-full text-lg p-4 ${!interviewTime ? 'pl-16' : 'pl-5'}`}
                                  value={interviewTime}
                                  onChange={(e) => setInterviewTime(e.target.value)}
                                />
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="label-text">Location / Meeting Link</label>
                            <input 
                              type="text" 
                              className="input-field" 
                              placeholder="e.g. Office Address or Google Meet Link"
                              value={interviewLocation}
                              onChange={(e) => setInterviewLocation(e.target.value)}
                            />
                          </div>

                          <div className="flex gap-4 pt-4">
                            <button
                              type="button"
                              onClick={handleSendWhatsApp}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20 hover:bg-emerald-500/20 transition-all text-sm font-bold"
                            >
                              <MessageSquare className="w-5 h-5" /> Send WhatsApp Reminder
                            </button>
                            <button
                              type="button"
                              onClick={handleSendEmail}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-500/10 text-blue-500 rounded-xl border border-blue-500/20 hover:bg-blue-500/20 transition-all text-sm font-bold"
                            >
                              <Mail className="w-5 h-5" /> Send Email Reminder
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {message.text && (
                      <div className={`p-4 rounded-2xl flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
                        {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        <p className="text-sm font-bold">{message.text}</p>
                      </div>
                    )}

                    <div className="flex justify-end gap-4 pt-6 border-t border-white/5">
                      <button 
                        type="submit" 
                        disabled={isUpdating}
                        className="btn-primary px-12"
                      >
                        {isUpdating ? 'Updating...' : 'Confirm Evaluation'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <div className="space-y-6">
                        <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                          <User className="w-3 h-3" /> Personal Information
                        </h4>
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Gender</p>
                            <p className="text-sm font-bold text-white">{selectedApplicant.gender}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">DOB</p>
                            <p className="text-sm font-bold text-white">{selectedApplicant.dob}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Mobile</p>
                            <p className="text-sm font-bold text-white">{selectedApplicant.mobileNumber}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Email</p>
                            <p className="text-sm font-bold text-white truncate">{selectedApplicant.emailId}</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                          <Briefcase className="w-3 h-3" /> Professional Details
                        </h4>
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Experience</p>
                            <p className="text-sm font-bold text-white">{selectedApplicant.experienceType}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Education</p>
                            <p className="text-sm font-bold text-white">{selectedApplicant.degreeType}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Current Salary</p>
                            <p className="text-sm font-bold text-white">{selectedApplicant.currentSalary || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Expected Salary</p>
                            <p className="text-sm font-bold text-white">{selectedApplicant.expectedSalary || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                        <MapPin className="w-3 h-3" /> Address & Location
                      </h4>
                      <p className="text-sm font-bold text-white leading-relaxed">{selectedApplicant.permanentAddress}, {selectedApplicant.city} - {selectedApplicant.pincode}</p>
                    </div>

                    {selectedApplicant.experienceDetails.length > 0 && (
                      <div className="space-y-6">
                        <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                          <History className="w-3 h-3" /> Work History
                        </h4>
                        <div className="space-y-4">
                          {selectedApplicant.experienceDetails.map((exp, i) => (
                            <div key={i} className="p-4 bg-white/5 rounded-2xl border border-white/5 flex justify-between items-center">
                              <div>
                                <p className="text-sm font-bold text-white">{exp.companyName}</p>
                                <p className="text-xs text-slate-500">{exp.role}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-indigo-400">{exp.yearsOfWork} Years</p>
                                <p className="text-[10px] text-slate-500 uppercase font-black">Duration</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center glass-card p-20 text-center border-dashed">
              <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-6">
                <Sparkles className="w-10 h-10 text-slate-700" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No Candidate Selected</h3>
              <p className="text-slate-500 max-w-xs">Select a candidate from the list on the left to start the evaluation process.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Reports View Component - Allows downloading applicant data as Excel or PDF
function ReportsView({ 
  applicants, 
  startDate, 
  endDate, 
  setStartDate, 
  setEndDate,
  downloadExcel,
  downloadPDF
}: { 
  applicants: ApplicantData[], 
  startDate: string, 
  endDate: string, 
  setStartDate: (v: string) => void, 
  setEndDate: (v: string) => void,
  downloadExcel: () => void,
  downloadPDF: () => void
}) {
  const filtered = applicants.filter(app => {
    if (!app.submittedAt) return false;
    if (!startDate && !endDate) return true;
    
    // Normalize dates to midnight for comparison if only date is provided
    const appDate = new Date(app.submittedAt);
    appDate.setHours(0, 0, 0, 0);
    
    const start = startDate ? new Date(startDate) : new Date(0);
    start.setHours(0, 0, 0, 0);
    
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);
    
    return appDate >= start && appDate <= end;
  });

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">Generate Reports</h2>
          <p className="text-slate-400 mt-1 font-medium">Select a date range to download candidate data</p>
        </div>
        {(startDate || endDate) && (
          <button 
            onClick={() => { setStartDate(''); setEndDate(''); }}
            className="text-xs font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-300 transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>

      <div className="glass-card p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="label-text">From Date</label>
            <div className="relative">
              <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="input-field pl-16"
              />
            </div>
          </div>
          <div>
            <label className="label-text">To Date</label>
            <div className="relative">
              <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                className="input-field pl-16"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-4">
          <button 
            onClick={downloadExcel}
            disabled={filtered.length === 0}
            className="flex-1 flex items-center justify-center gap-3 px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-900/20 hover:bg-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet className="w-6 h-6" /> Download Excel Report ({filtered.length})
          </button>
          <button 
            onClick={downloadPDF}
            disabled={filtered.length === 0}
            className="flex-1 flex items-center justify-center gap-3 px-8 py-4 bg-rose-600 text-white rounded-2xl font-black shadow-lg shadow-rose-900/20 hover:bg-rose-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="w-6 h-6" /> Download PDF Report ({filtered.length})
          </button>
        </div>

        {filtered.length === 0 && (startDate || endDate) && (
          <p className="text-center text-rose-400 font-bold text-sm">No candidates found in the selected date range.</p>
        )}
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-white/5 bg-white/5">
          <h3 className="text-lg font-black text-white">Preview ({filtered.length} candidates)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/50">
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Candidate</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Position</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.slice(0, 5).map((app) => (
                <tr key={app.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-white">{app.fullName}</p>
                    <p className="text-xs text-slate-500">{app.mobileNumber}</p>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-300">{app.positionApplied}</td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-400">
                    {app.submittedAt ? (app.submittedAt.includes(',') ? app.submittedAt.split(',')[0] : new Date(app.submittedAt).toLocaleDateString()) : 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                      app.status === 'Onboarded' || app.status === 'Offered' ? 'bg-emerald-500/10 text-emerald-500' :
                      app.status === 'Rejected' ? 'bg-rose-500/10 text-rose-500' :
                      app.status === 'Interview' ? 'bg-amber-500/10 text-amber-500' :
                      app.status === 'Waiting List' ? 'bg-purple-500/10 text-purple-500' :
                      'bg-blue-500/10 text-blue-500'
                    }`}>
                      {app.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length > 5 && (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-xs text-slate-500 font-bold">
                    + {filtered.length - 5} more candidates...
                  </td>
                </tr>
              )}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500 font-bold">
                    No data available for the selected range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Analytics View Component - Displays charts and statistics for recruitment data
function AnalyticsView({ applicants }: { applicants: ApplicantData[] }) {
  const statusData = [
    { name: 'Applied', value: applicants.filter(a => a.status === 'Applied').length },
    { name: 'Screening', value: applicants.filter(a => a.status === 'Screening').length },
    { name: 'Interview', value: applicants.filter(a => a.status === 'Interview').length },
    { name: 'Selected / Offered', value: applicants.filter(a => a.status === 'Offered').length },
    { name: 'Onboarded', value: applicants.filter(a => a.status === 'Onboarded').length },
    { name: 'Waiting List', value: applicants.filter(a => a.status === 'Waiting List').length },
    { name: 'Rejected', value: applicants.filter(a => a.status === 'Rejected').length },
  ].filter(d => d.value > 0);

  const COLORS = ['#3b82f6', '#06b6d4', '#f59e0b', '#10b981', '#14b8a6', '#8b5cf6', '#ef4444'];

  const sourceData = [
    { name: 'LinkedIn', value: applicants.filter(a => a.sourceOfApplication === 'LinkedIn').length },
    { name: 'Indeed', value: applicants.filter(a => a.sourceOfApplication === 'Indeed').length },
    { name: 'Website', value: applicants.filter(a => a.sourceOfApplication === 'Company Website').length },
    { name: 'Referral', value: applicants.filter(a => a.sourceOfApplication === 'Referral').length },
    { name: 'Walk-in', value: applicants.filter(a => a.sourceOfApplication === 'Walk-in').length },
    { name: 'Other', value: applicants.filter(a => a.sourceOfApplication === 'Other').length },
  ].filter(d => d.value > 0);

  // Growth data (by month)
  const monthlyData = applicants
    .filter(a => a.submittedAt)
    .reduce((acc: any[], app) => {
      const date = new Date(app.submittedAt);
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear();
    const key = `${month} ${year}`;
    
    const existing = acc.find(d => d.name === key);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({ name: key, count: 1, date });
    }
    return acc;
  }, []).sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-3xl font-black text-white tracking-tight">Talent Analytics</h2>
        <p className="text-slate-400 mt-1 font-medium">Visualizing recruitment growth and pipeline health</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Status Distribution */}
        <div className="stat-card p-8">
          <h3 className="text-lg font-black text-white mb-8 flex items-center gap-3">
            <BadgeCheck className="w-5 h-5 text-indigo-400" /> Application Pipeline
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Source Distribution */}
        <div className="stat-card p-8">
          <h3 className="text-lg font-black text-white mb-8 flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-indigo-400" /> Sourcing Channels
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: '#ffffff05' }}
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }}
                />
                <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Growth Trend */}
        <div className="lg:col-span-2 stat-card p-8">
          <h3 className="text-lg font-black text-white mb-8 flex items-center gap-3">
            <LayoutDashboard className="w-5 h-5 text-indigo-400" /> Recruitment Trend
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }}
                />
                <Line type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={3} dot={{ r: 6, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// User Management View Component - Allows Admin to create, edit, and delete HR users
function UserManagementView({ users, onRefresh }: { users: UserProfile[], onRefresh: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [newUser, setNewUser] = useState({ email: '', name: '', role: 'HR' as Role, password: '' });
  const [editData, setEditData] = useState({ email: '', name: '', role: 'HR' as Role, password: '' });
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      if (response.ok) {
        setMessage({ text: 'User created successfully!', type: 'success' });
        setShowAdd(false);
        setNewUser({ email: '', name: '', role: 'HR', password: '' });
        onRefresh();
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      } else {
        setMessage({ text: 'Failed to create user.', type: 'error' });
      }
    } catch (error) {
      setMessage({ text: 'An error occurred.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });
      if (response.ok) {
        setMessage({ text: 'User updated successfully!', type: 'success' });
        setEditingUser(null);
        onRefresh();
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      } else {
        setMessage({ text: 'Failed to update user.', type: 'error' });
      }
    } catch (error) {
      setMessage({ text: 'An error occurred.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (user: UserProfile) => {
    setEditingUser(user);
    setEditData({ email: user.email, name: user.name, role: user.role, password: '' });
    setShowAdd(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        const response = await fetch(`/api/users/${id}`, { method: 'DELETE' });
        if (response.ok) onRefresh();
      } catch (error) {
        console.error('Failed to delete user:', error);
      }
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">User Management</h2>
          <p className="text-slate-400 mt-1 font-medium">Manage system access and permissions</p>
        </div>
        <button 
          onClick={() => { setShowAdd(true); setEditingUser(null); }}
          className="btn-primary"
        >
          <Plus className="w-5 h-5" /> Create New User
        </button>
      </div>

      <AnimatePresence>
        {message.text && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-2xl mb-6 flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}
          >
            {message.type === 'success' ? <BadgeCheck className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <p className="text-xs font-bold">{message.text}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(showAdd || editingUser) && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-card p-8 border-indigo-500/30"
          >
            <h3 className="text-lg font-bold text-white mb-6">{editingUser ? 'Edit User' : 'Create New User'}</h3>
            <form onSubmit={editingUser ? handleUpdate : handleCreate} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
              <div>
                <label className="label-text">Full Name</label>
                <input 
                  type="text" required 
                  value={editingUser ? editData.name : newUser.name}
                  onChange={e => editingUser ? setEditData(prev => ({ ...prev, name: e.target.value })) : setNewUser(prev => ({ ...prev, name: e.target.value }))}
                  className="input-field" placeholder="User Name"
                />
              </div>
              <div>
                <label className="label-text">Email Address</label>
                <input 
                  type="email" required 
                  value={editingUser ? editData.email : newUser.email}
                  onChange={e => editingUser ? setEditData(prev => ({ ...prev, email: e.target.value })) : setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  className="input-field" placeholder="email@prohrms.com"
                />
              </div>
              <div>
                <label className="label-text">Role</label>
                <select 
                  value={editingUser ? editData.role : newUser.role}
                  onChange={e => editingUser ? setEditData(prev => ({ ...prev, role: e.target.value as Role })) : setNewUser(prev => ({ ...prev, role: e.target.value as Role }))}
                  className="input-field"
                >
                  <option value="HR">HR Manager</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>
              <div>
                <label className="label-text">{editingUser ? 'New Password (Optional)' : 'Password'}</label>
                <input 
                  type="password" required={!editingUser}
                  value={editingUser ? editData.password : newUser.password}
                  onChange={e => editingUser ? setEditData(prev => ({ ...prev, password: e.target.value })) : setNewUser(prev => ({ ...prev, password: e.target.value }))}
                  className="input-field" placeholder="••••••••"
                />
              </div>
              <div className="lg:col-span-4 flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => { setShowAdd(false); setEditingUser(null); }} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary">
                  {isSubmitting ? 'Processing...' : (editingUser ? 'Update User' : 'Create User')}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead>
              <tr className="bg-white/5 border-b border-white/5">
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">User</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Email</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Role</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center font-black text-indigo-400 text-xs">
                        {u.name.charAt(0)}
                      </div>
                      <span className="text-sm font-bold text-white">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      u.role === 'ADMIN' ? 'bg-amber-500/10 text-amber-500' : 'bg-indigo-500/10 text-indigo-400'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => startEdit(u)}
                        className="p-2 text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                        title="Edit User"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(u.id)}
                        className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="text-center text-slate-500 text-xs py-4">
        &copy; {new Date().getFullYear()} Jailaxmi Group. All rights reserved.
      </div>
    </div>
  );
}
