import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import postgres from "postgres";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure CandidateResumes directory exists
const uploadDir = path.join(process.cwd(), "CandidateResumes");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const candidateName = req.body.candidateName || 'Candidate';
    const safeName = candidateName.replace(/[^a-zA-Z0-9]/g, '_');
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now();
    cb(null, `${safeName}_Resume_${uniqueSuffix}${ext}`);
  },
});
const upload = multer({ storage });

const isCloud = !!(process.env.DATABASE_URL || process.env.NEON_URL);
let db: any;
let sql: any;

if (isCloud) {
  const dbUrl = process.env.DATABASE_URL || process.env.NEON_URL;
  sql = postgres(dbUrl!, { ssl: 'require' });
  console.log("Using Cloud Database (PostgreSQL)");
} else {
  db = new Database("hrms.db");
  console.log("Using Local Database (SQLite)");
}

// Helper to handle DB queries for both SQLite and Postgres
const query = {
  async exec(sqlStr: string) {
    if (isCloud) {
      // Convert SQLite CREATE syntax to Postgres if needed
      let pSql = sqlStr.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, "SERIAL PRIMARY KEY");
      await sql.unsafe(pSql);
    } else {
      db.exec(sqlStr);
    }
  },
  async get(sqlStr: string, params: any[] = []) {
    if (isCloud) {
      let i = 1;
      const pSql = sqlStr.replace(/\?/g, () => `$${i++}`);
      const rows = await sql.unsafe(pSql, params);
      return rows[0];
    } else {
      return db.prepare(sqlStr).get(...params);
    }
  },
  async all(sqlStr: string, params: any[] = []) {
    if (isCloud) {
      let i = 1;
      const pSql = sqlStr.replace(/\?/g, () => `$${i++}`);
      return await sql.unsafe(pSql, params);
    } else {
      return db.prepare(sqlStr).all(...params);
    }
  },
  async run(sqlStr: string, params: any[] = []) {
    if (isCloud) {
      let i = 1;
      const pSql = sqlStr.replace(/\?/g, () => `$${i++}`);
      await sql.unsafe(pSql, params);
    } else {
      db.prepare(sqlStr).run(...params);
    }
  }
};

async function initDb() {
  await query.exec(`
    CREATE TABLE IF NOT EXISTS applicants (
      id TEXT PRIMARY KEY,
      fullName TEXT,
      fatherName TEXT,
      fatherEducation TEXT,
      fatherSalary TEXT,
      fatherEmployment TEXT,
      fatherMobile TEXT,
      motherName TEXT,
      motherEducation TEXT,
      motherSalary TEXT,
      motherEmployment TEXT,
      motherMobile TEXT,
      spouseName TEXT,
      spouseEducation TEXT,
      spouseSalary TEXT,
      spouseEmployment TEXT,
      spouseMobile TEXT,
      gender TEXT,
      dob TEXT,
      mobileNumber TEXT,
      emailId TEXT,
      permanentAddress TEXT,
      city TEXT,
      pincode TEXT,
      aadhaarNumber TEXT,
      panNumber TEXT,
      drivingLicenceNumber TEXT,
      bloodGroup TEXT,
      maritalStatus TEXT,
      numberOfKids INTEGER,
      kidsDetails TEXT,
      numberOfSiblings INTEGER,
      siblingsDetails TEXT,
      emergencyContactName TEXT,
      emergencyContactNumber TEXT,
      experienceType TEXT,
      positionApplied TEXT,
      branch TEXT,
      district TEXT,
      degreeType TEXT,
      instituteName TEXT,
      educationDetails TEXT,
      passedOutYear TEXT,
      numberOfCompanies INTEGER,
      experienceDetails TEXT,
      currentSalary TEXT,
      expectedSalary TEXT,
      sourceOfApplication TEXT,
      sourceRemark TEXT,
      refererName TEXT,
      refererBranch TEXT,
      refererDesignation TEXT,
      refererEmpId TEXT,
      refererMobile TEXT,
      interviewScore TEXT,
      interviewRemarks TEXT,
      techScore REAL,
      commScore REAL,
      fitScore REAL,
      status TEXT,
      submittedBy TEXT,
      submittedAt TEXT,
      resumePath TEXT
    );
  `);

  // Add new columns if they don't exist
  const columnsToAdd = [
    { name: 'resumePath', type: 'TEXT' },
    { name: 'techScore', type: 'REAL' },
    { name: 'commScore', type: 'REAL' },
    { name: 'fitScore', type: 'REAL' },
    { name: 'interviewDate', type: 'TEXT' },
    { name: 'interviewTime', type: 'TEXT' },
    { name: 'interviewLocation', type: 'TEXT' },
    { name: 'submittedAs', type: 'TEXT' }
  ];

  for (const col of columnsToAdd) {
    try {
      if (isCloud) {
        await query.exec(`ALTER TABLE applicants ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
      } else {
        await query.exec(`ALTER TABLE applicants ADD COLUMN ${col.name} ${col.type}`);
      }
    } catch (e) {
      // Column likely already exists
    }
  }

  await query.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      name TEXT,
      role TEXT,
      password TEXT
    );
  `);

  const userCount = await query.get("SELECT count(*) as count FROM users");
  if (parseInt(userCount.count) === 0) {
    await query.run("INSERT INTO users (id, email, name, role, password) VALUES (?, ?, ?, ?, ?)", ['admin', 'admin@prohrms.com', 'Super Admin', 'ADMIN', 'admin123']);
    await query.run("INSERT INTO users (id, email, name, role, password) VALUES (?, ?, ?, ?, ?)", ['hr1', 'hr1@prohrms.com', 'Priya Sharma', 'HR', 'hr123']);
    await query.run("INSERT INTO users (id, email, name, role, password) VALUES (?, ?, ?, ?, ?)", ['hr2', 'hr2@prohrms.com', 'Arun Kumar', 'HR', 'hr123']);
  }
}

async function startServer() {
  await initDb();
  
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
  app.use("/CandidateResumes", express.static(path.join(process.cwd(), "CandidateResumes")));

  // Auth & User Routes
  app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      const user = await query.get("SELECT * FROM users WHERE email = ? AND password = ?", [email, password]);
      if (user) {
        const normalized: any = {};
        Object.keys(user).forEach(key => {
          normalized[key.toLowerCase()] = user[key];
        });
        const { password, ...userWithoutPassword } = normalized;
        res.json(userWithoutPassword);
      } else {
        res.status(401).json({ error: "Invalid credentials" });
      }
    } catch (error) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.get("/api/users", async (req, res) => {
    try {
      const rows = await query.all("SELECT id, email, name, role FROM users");
      const users = rows.map((row: any) => {
        const normalized: any = {};
        Object.keys(row).forEach(key => {
          normalized[key.toLowerCase()] = row[key];
        });
        return normalized;
      });
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post("/api/users", async (req, res) => {
    const { email, name, role, password } = req.body;
    const id = Math.random().toString(36).substr(2, 9);
    try {
      await query.run("INSERT INTO users (id, email, name, role, password) VALUES (?, ?, ?, ?, ?)", [id, email, name, role, password]);
      res.status(201).json({ message: "User created" });
    } catch (error) {
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    const { id } = req.params;
    const { email, name, role, password } = req.body;
    try {
      if (password) {
        await query.run("UPDATE users SET email = ?, name = ?, role = ?, password = ? WHERE id = ?", [email, name, role, password, id]);
      } else {
        await query.run("UPDATE users SET email = ?, name = ?, role = ? WHERE id = ?", [email, name, role, id]);
      }
      res.json({ message: "User updated" });
    } catch (error) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await query.run("DELETE FROM users WHERE id = ?", [id]);
      res.json({ message: "User deleted" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // API Routes
  app.get("/api/check-aadhaar", async (req, res) => {
    const { number } = req.query;
    try {
      // Normalize both the input and the stored value by removing spaces
      const existing = await query.all("SELECT submittedAt FROM applicants WHERE REPLACE(aadhaarNumber, ' ', '') = ? ORDER BY submittedAt DESC", [number]);
      if (existing && existing.length > 0) {
        const lastSubmission = new Date(existing[0].submittedAt);
        const now = new Date();
        if (!isNaN(lastSubmission.getTime())) {
          const diffTime = Math.abs(now.getTime() - lastSubmission.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays < 30) {
            return res.json({ exists: true });
          }
        }
      }
      res.json({ exists: false });
    } catch (error) {
      res.status(500).json({ error: "Failed to check Aadhaar" });
    }
  });

  app.get("/api/check-mobile", async (req, res) => {
    const { number } = req.query;
    try {
      const existing = await query.all("SELECT submittedAt FROM applicants WHERE mobileNumber = ? ORDER BY submittedAt DESC", [number]);
      if (existing && existing.length > 0) {
        const lastSubmission = new Date(existing[0].submittedAt);
        const now = new Date();
        if (!isNaN(lastSubmission.getTime())) {
          const diffTime = Math.abs(now.getTime() - lastSubmission.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays < 60) {
            return res.json({ exists: true });
          }
        }
      }
      res.json({ exists: false });
    } catch (error) {
      res.status(500).json({ error: "Failed to check Mobile" });
    }
  });

  app.post("/api/upload-resume", (req, res) => {
    upload.single("resume")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: `Multer error: ${err.message}` });
      } else if (err) {
        return res.status(500).json({ error: `Unknown upload error: ${err.message}` });
      }
      
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      res.json({ path: `/CandidateResumes/${req.file.filename}` });
    });
  });

  app.get("/api/applicants", async (req, res) => {
    try {
      const rows = await query.all("SELECT * FROM applicants ORDER BY submittedAt DESC");
      
      // Normalize keys for both SQLite (case-sensitive) and Postgres (lowercase)
      const applicants = rows.map((row: any) => {
        const normalized: any = {};
        
        // Map common keys to camelCase if they are lowercase
        Object.keys(row).forEach(key => {
          const lowerKey = key.toLowerCase();
          // Map specific keys that frontend expects in camelCase
          if (lowerKey === 'fullname') normalized.fullName = row[key];
          else if (lowerKey === 'fathername') normalized.fatherName = row[key];
          else if (lowerKey === 'fathereducation') normalized.fatherEducation = row[key];
          else if (lowerKey === 'fathersalary') normalized.fatherSalary = row[key];
          else if (lowerKey === 'fatheremployment') normalized.fatherEmployment = row[key];
          else if (lowerKey === 'fathermobile') normalized.fatherMobile = row[key];
          else if (lowerKey === 'mothername') normalized.motherName = row[key];
          else if (lowerKey === 'mothereducation') normalized.motherEducation = row[key];
          else if (lowerKey === 'mothersalary') normalized.motherSalary = row[key];
          else if (lowerKey === 'motheremployment') normalized.motherEmployment = row[key];
          else if (lowerKey === 'mothermobile') normalized.motherMobile = row[key];
          else if (lowerKey === 'spousename') normalized.spouseName = row[key];
          else if (lowerKey === 'spouseeducation') normalized.spouseEducation = row[key];
          else if (lowerKey === 'spousesalary') normalized.spouseSalary = row[key];
          else if (lowerKey === 'spouseemployment') normalized.spouseEmployment = row[key];
          else if (lowerKey === 'spousemobile') normalized.spouseMobile = row[key];
          else if (lowerKey === 'mobilenumber') normalized.mobileNumber = row[key];
          else if (lowerKey === 'emailid') normalized.emailId = row[key];
          else if (lowerKey === 'permanentaddress') normalized.permanentAddress = row[key];
          else if (lowerKey === 'city') normalized.city = row[key];
          else if (lowerKey === 'pincode') normalized.pincode = row[key];
          else if (lowerKey === 'aadhaarnumber') normalized.aadhaarNumber = row[key];
          else if (lowerKey === 'pannumber') normalized.panNumber = row[key];
          else if (lowerKey === 'drivinglicencenumber') normalized.drivingLicenceNumber = row[key];
          else if (lowerKey === 'bloodgroup') normalized.bloodGroup = row[key];
          else if (lowerKey === 'maritalstatus') normalized.maritalStatus = row[key];
          else if (lowerKey === 'numberofkids') normalized.numberOfKids = row[key];
          else if (lowerKey === 'kidsdetails') normalized.kidsDetails = row[key];
          else if (lowerKey === 'numberofsiblings') normalized.numberOfSiblings = row[key];
          else if (lowerKey === 'siblingsdetails') normalized.siblingsDetails = row[key];
          else if (lowerKey === 'emergencycontactname') normalized.emergencyContactName = row[key];
          else if (lowerKey === 'emergencycontactnumber') normalized.emergencyContactNumber = row[key];
          else if (lowerKey === 'experiencetype') normalized.experienceType = row[key];
          else if (lowerKey === 'positionapplied') normalized.positionApplied = row[key];
          else if (lowerKey === 'branch') normalized.branch = row[key];
          else if (lowerKey === 'district') normalized.district = row[key];
          else if (lowerKey === 'degreetype') normalized.degreeType = row[key];
          else if (lowerKey === 'institutename') normalized.instituteName = row[key];
          else if (lowerKey === 'educationdetails') normalized.educationDetails = row[key];
          else if (lowerKey === 'passedoutyear') normalized.passedOutYear = row[key];
          else if (lowerKey === 'numberofcompanies') normalized.numberOfCompanies = row[key];
          else if (lowerKey === 'experiencedetails') normalized.experienceDetails = row[key];
          else if (lowerKey === 'currentsalary') normalized.currentSalary = row[key];
          else if (lowerKey === 'expectedsalary') normalized.expectedSalary = row[key];
          else if (lowerKey === 'sourceofapplication') normalized.sourceOfApplication = row[key];
          else if (lowerKey === 'sourceremark') normalized.sourceRemark = row[key];
          else if (lowerKey === 'referername') normalized.refererName = row[key];
          else if (lowerKey === 'refererbranch') normalized.refererBranch = row[key];
          else if (lowerKey === 'refererdesignation') normalized.refererDesignation = row[key];
          else if (lowerKey === 'refererempid') normalized.refererEmpId = row[key];
          else if (lowerKey === 'referermobile') normalized.refererMobile = row[key];
          else if (lowerKey === 'interviewscore') normalized.interviewScore = row[key];
          else if (lowerKey === 'interviewremarks') normalized.interviewRemarks = row[key];
          else if (lowerKey === 'techscore') normalized.techScore = row[key];
          else if (lowerKey === 'commscore') normalized.commScore = row[key];
          else if (lowerKey === 'fitscore') normalized.fitScore = row[key];
          else if (lowerKey === 'interviewdate') normalized.interviewDate = row[key];
          else if (lowerKey === 'interviewtime') normalized.interviewTime = row[key];
          else if (lowerKey === 'interviewlocation') normalized.interviewLocation = row[key];
          else if (lowerKey === 'status') normalized.status = row[key];
          else if (lowerKey === 'submittedby') normalized.submittedBy = row[key];
          else if (lowerKey === 'submittedat') normalized.submittedAt = row[key];
          else if (lowerKey === 'resumepath') normalized.resumePath = row[key];
          else normalized[key] = row[key];
        });

        return {
          ...normalized,
          kidsDetails: JSON.parse(normalized.kidsDetails || "[]"),
          siblingsDetails: JSON.parse(normalized.siblingsDetails || "[]"),
          experienceDetails: JSON.parse(normalized.experienceDetails || "[]"),
        };
      });
      res.json(applicants);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch applicants" });
    }
  });

  app.post("/api/applicants", async (req, res) => {
    const data = req.body;
    try {
      // Generate sequential ID like INT01, INT02, etc.
      const maxIdResult = await query.all("SELECT id FROM applicants WHERE id LIKE 'INT%'");
      let nextNum = 1;
      if (maxIdResult && maxIdResult.length > 0) {
        const nums = maxIdResult.map((r: any) => parseInt(r.id.substring(3), 10)).filter((n: number) => !isNaN(n));
        if (nums.length > 0) {
          nextNum = Math.max(...nums) + 1;
        }
      }
      data.id = `INT${nextNum.toString().padStart(2, '0')}`;

      console.log('Inserting applicant with ID:', data.id);
      
      // Check if candidate with same Aadhaar has attended in the last 30 days
      if (data.aadhaarNumber) {
        const normalizedAadhaar = data.aadhaarNumber.replace(/\s/g, '');
        const existing = await query.all("SELECT submittedAt FROM applicants WHERE REPLACE(aadhaarNumber, ' ', '') = ? ORDER BY submittedAt DESC", [normalizedAadhaar]);
        if (existing && existing.length > 0) {
          const lastSubmission = new Date(existing[0].submittedAt);
          const now = new Date();
          
          if (!isNaN(lastSubmission.getTime())) {
            const diffTime = Math.abs(now.getTime() - lastSubmission.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays < 30) {
              return res.status(400).json({ error: "Already Interviewed within the last 30 days" });
            }
          }
        }
      }

      const params = [
        data.id, data.fullName, data.fatherName, data.fatherEducation, data.fatherSalary, data.fatherEmployment, data.fatherMobile,
        data.motherName, data.motherEducation, data.motherSalary, data.motherEmployment, data.motherMobile,
        data.spouseName, data.spouseEducation, data.spouseSalary, data.spouseEmployment, data.spouseMobile,
        data.gender, data.dob, data.mobileNumber, data.emailId, data.permanentAddress, data.city, data.pincode,
        data.aadhaarNumber, data.panNumber, data.drivingLicenceNumber, data.bloodGroup, data.maritalStatus,
        parseInt(data.numberOfKids) || 0, JSON.stringify(data.kidsDetails || []), parseInt(data.numberOfSiblings) || 0, JSON.stringify(data.siblingsDetails || []),
        data.emergencyContactName, data.emergencyContactNumber, data.experienceType, data.positionApplied, data.branch, data.district, data.degreeType,
        data.instituteName, data.educationDetails, data.passedOutYear, parseInt(data.numberOfCompanies) || 0,
        JSON.stringify(data.experienceDetails || []), data.currentSalary, data.expectedSalary, data.sourceOfApplication,
        data.sourceRemark, data.refererName, data.refererBranch, data.refererDesignation, data.refererEmpId,
        data.refererMobile, data.interviewScore, data.interviewRemarks, parseFloat(data.techScore) || 0, parseFloat(data.commScore) || 0, parseFloat(data.fitScore) || 0, data.interviewDate, data.interviewTime, data.interviewLocation, data.status, data.submittedBy, data.submittedAt, data.resumePath, data.submittedAs
      ].map(v => v === undefined ? null : v);

      console.log('Parameters count:', params.length);

      await query.run(`
        INSERT INTO applicants (
          id, fullName, fatherName, fatherEducation, fatherSalary, fatherEmployment, fatherMobile,
          motherName, motherEducation, motherSalary, motherEmployment, motherMobile,
          spouseName, spouseEducation, spouseSalary, spouseEmployment, spouseMobile,
          gender, dob, mobileNumber, emailId, permanentAddress, city, pincode,
          aadhaarNumber, panNumber, drivingLicenceNumber, bloodGroup, maritalStatus,
          numberOfKids, kidsDetails, numberOfSiblings, siblingsDetails,
          emergencyContactName, emergencyContactNumber, experienceType, positionApplied, branch, district, degreeType,
          instituteName, educationDetails, passedOutYear, numberOfCompanies,
          experienceDetails, currentSalary, expectedSalary, sourceOfApplication,
          sourceRemark, refererName, refererBranch, refererDesignation, refererEmpId,
          refererMobile, interviewScore, interviewRemarks, techScore, commScore, fitScore, interviewDate, interviewTime, interviewLocation, status, submittedBy, submittedAt, resumePath, submittedAs
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, params);
      res.status(201).json({ message: "Applicant created" });
    } catch (error: any) {
      console.error('Error creating applicant:', error);
      res.status(500).json({ error: error.message || "Failed to create applicant" });
    }
  });

  app.put("/api/applicants/:id", async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    try {
      const params = [
        data.fullName, data.fatherName, data.fatherEducation, data.fatherSalary, data.fatherEmployment, data.fatherMobile,
        data.motherName, data.motherEducation, data.motherSalary, data.motherEmployment, data.motherMobile,
        data.spouseName, data.spouseEducation, data.spouseSalary, data.spouseEmployment, data.spouseMobile,
        data.gender, data.dob, data.mobileNumber, data.emailId, data.permanentAddress, data.city, data.pincode,
        data.aadhaarNumber, data.panNumber, data.drivingLicenceNumber, data.bloodGroup, data.maritalStatus,
        parseInt(data.numberOfKids) || 0, JSON.stringify(data.kidsDetails || []), parseInt(data.numberOfSiblings) || 0, JSON.stringify(data.siblingsDetails || []),
        data.emergencyContactName, data.emergencyContactNumber, data.experienceType, data.positionApplied, data.branch, data.district, data.degreeType,
        data.instituteName, data.educationDetails, data.passedOutYear, parseInt(data.numberOfCompanies) || 0,
        JSON.stringify(data.experienceDetails || []), data.currentSalary, data.expectedSalary, data.sourceOfApplication,
        data.sourceRemark, data.refererName, data.refererBranch, data.refererDesignation, data.refererEmpId,
        data.refererMobile, data.interviewScore, data.interviewRemarks, parseFloat(data.techScore) || 0, parseFloat(data.commScore) || 0, parseFloat(data.fitScore) || 0, data.interviewDate, data.interviewTime, data.interviewLocation, data.status,
        data.submittedBy, data.submittedAt, data.resumePath, id
      ].map(v => v === undefined ? null : v);
      
      console.log('Updating applicant with ID:', id);
      console.log('Parameters count:', params.length);

      await query.run(`
        UPDATE applicants SET
          fullName = ?, fatherName = ?, fatherEducation = ?, fatherSalary = ?, fatherEmployment = ?, fatherMobile = ?,
          motherName = ?, motherEducation = ?, motherSalary = ?, motherEmployment = ?, motherMobile = ?,
          spouseName = ?, spouseEducation = ?, spouseSalary = ?, spouseEmployment = ?, spouseMobile = ?,
          gender = ?, dob = ?, mobileNumber = ?, emailId = ?, permanentAddress = ?, city = ?, pincode = ?,
          aadhaarNumber = ?, panNumber = ?, drivingLicenceNumber = ?, bloodGroup = ?, maritalStatus = ?,
          numberOfKids = ?, kidsDetails = ?, numberOfSiblings = ?, siblingsDetails = ?,
          emergencyContactName = ?, emergencyContactNumber = ?, experienceType = ?, positionApplied = ?, branch = ?, district = ?, degreeType = ?,
          instituteName = ?, educationDetails = ?, passedOutYear = ?, numberOfCompanies = ?,
          experienceDetails = ?, currentSalary = ?, expectedSalary = ?, sourceOfApplication = ?,
          sourceRemark = ?, refererName = ?, refererBranch = ?, refererDesignation = ?, refererEmpId = ?,
          refererMobile = ?, interviewScore = ?, interviewRemarks = ?, techScore = ?, commScore = ?, fitScore = ?, interviewDate = ?, interviewTime = ?, interviewLocation = ?, status = ?,
          submittedBy = ?, submittedAt = ?, resumePath = ?
        WHERE id = ?
      `, params);
      res.json({ message: "Applicant updated" });
    } catch (error: any) {
      console.error('Error updating applicant:', error);
      res.status(500).json({ error: error.message || "Failed to update applicant" });
    }
  });

  app.patch("/api/applicants/:id/evaluation", async (req, res) => {
    const { id } = req.params;
    const { interviewScore, interviewRemarks, status, techScore, commScore, fitScore, interviewDate, interviewTime, interviewLocation } = req.body;
    try {
      await query.run("UPDATE applicants SET interviewScore = ?, interviewRemarks = ?, status = ?, techScore = ?, commScore = ?, fitScore = ?, interviewDate = ?, interviewTime = ?, interviewLocation = ? WHERE id = ?", [interviewScore, interviewRemarks, status, techScore, commScore, fitScore, interviewDate, interviewTime, interviewLocation, id]);
      res.json({ message: "Evaluation updated" });
    } catch (error) {
      res.status(500).json({ error: "Failed to update evaluation" });
    }
  });

  app.delete("/api/applicants/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await query.run("DELETE FROM applicants WHERE id = ?", [id]);
      res.json({ message: "Applicant deleted" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete applicant" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  // Global Error Handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('Global Error Handler:', err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
