export type Role = 'ADMIN' | 'HR';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatar?: string;
}

export type Gender = 'Male' | 'Female' | 'Other';
export type MaritalStatus = 'Single' | 'Married' | 'Divorced' | 'Widowed';
export type ExperienceType = 'Fresher' | 'Experience';
export type ApplicationSource = 'LinkedIn' | 'Indeed' | 'Company Website' | 'Referral' | 'Walk-in' | 'Other';
export type ApplicantStatus = 'Applied' | 'Screening' | 'Interview' | 'Offered' | 'Rejected' | 'Onboarded' | 'Waiting List';

export interface KidDetail {
  name: string;
  age: string;
  education: string;
}

export interface SiblingDetail {
  name: string;
  age: string;
  gender: Gender | '';
  education: string;
  location: string;
}

export interface ExperienceDetail {
  companyName: string;
  role: string;
  salary: string;
  yearsOfWork: string;
}

export interface ApplicantData {
  id: string;
  fullName: string;
  fatherName: string;
  fatherEducation: string;
  fatherSalary: string;
  fatherEmployment: 'Employed' | 'Unemployed' | '';
  fatherMobile: string;
  motherName: string;
  motherEducation: string;
  motherSalary: string;
  motherEmployment: 'Employed' | 'Unemployed' | '';
  motherMobile: string;
  spouseName: string;
  spouseEducation: string;
  spouseSalary: string;
  spouseEmployment: 'Employed' | 'Unemployed' | '';
  spouseMobile: string;
  gender: Gender | '';
  dob: string;
  mobileNumber: string;
  emailId: string;
  permanentAddress: string;
  city: string;
  pincode: string;
  aadhaarNumber: string;
  panNumber: string;
  drivingLicenceNumber: string;
  bloodGroup: string;
  maritalStatus: MaritalStatus | '';
  numberOfKids: number;
  kidsDetails: KidDetail[];
  numberOfSiblings: number;
  siblingsDetails: SiblingDetail[];
  emergencyContactName: string;
  emergencyContactNumber: string;
  experienceType: ExperienceType | '';
  positionApplied: string;
  branch: string;
  district: string;
  // Career fields
  degreeType: 'Bachelors' | 'Masters' | '';
  instituteName: string;
  educationDetails: string;
  passedOutYear: string;
  // Experienced fields
  numberOfCompanies: number;
  experienceDetails: ExperienceDetail[];
  currentSalary: string;
  expectedSalary: string;
  sourceOfApplication: ApplicationSource | '';
  sourceRemark: string;
  refererName: string;
  refererBranch: string;
  refererDesignation: string;
  refererEmpId: string;
  refererMobile: string;
  // Interview fields
  interviewScore: string;
  interviewRemarks: string;
  interviewDate?: string;
  interviewTime?: string;
  interviewLocation?: string;
  techScore?: number;
  commScore?: number;
  fitScore?: number;
  status: ApplicantStatus | 'Waiting List';
  resume: File | null;
  resumePath?: string;
  submittedBy: string; // User ID
  submittedAt: string;
  submittedAs?: 'HR' | 'Candidate';
}
