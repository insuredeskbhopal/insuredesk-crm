"use client";

/* global AbortController, clearTimeout */
import { useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle, Search, UserPlus, X } from "lucide-react";
import PageHeader from "@/app/components/layout/PageHeader";

const EMPTY_FORM = {
  name: "",
  phone: "",
  alternatePhone: "",
  email: "",
  address: "",
  city: "",
  state: "",
  occupation: "",
  businessType: "",
  contactPersonName: "",
  customerType: "New",
  assignedTo: "",
  referenceSource: "",
  sourcePolicyId: "",
  sourcePolicyNumber: "",
  sourcePolicyType: "",
  sourceCompany: "",
  selectedLOBs: [],
  lobDetails: {},
  status: "New Lead",
  followUpDate: "",
  lastFollowUpDate: "",
  nextFollowUpDate: "",
  followUpRemark: "",
  followUpOutcome: "",
  remarks: ""
};

const PROFILE_STATUS = ["New Lead", "Follow-up Required", "Interested", "Not Interested", "Converted", "Lost"];
const CUSTOMER_TYPES = ["New", "Existing"];
const FOLLOW_UP_OUTCOMES = ["", "Interested", "Call Back Later", "Not Interested", "Converted", "Wrong Number", "Not Reachable"];
const FOLLOW_UP_MODES = ["Call", "WhatsApp", "Visit", "Email", "SMS", "Other"];
const FOLLOW_UP_PRIORITIES = ["Normal", "High", "Urgent", "Low"];
const EMPTY_COUNTERS = {
  totalProfiles: 0,
  newLeads: 0,
  followUpRequired: 0,
  interested: 0,
  converted: 0,
  lost: 0
};
const EMPTY_SEARCH_RESULTS = { profiles: [], policyMatches: [], claimedByAnotherUser: false };

const STATE_CITY_OPTIONS = {
  "Andaman and Nicobar Islands": ["Bamboo Flat", "Diglipur", "Mayabunder", "Port Blair", "Rangat"],
  "Andhra Pradesh": ["Adoni", "Amalapuram", "Amaravati", "Anakapalle", "Anantapur", "Bhimavaram", "Chittoor", "Eluru", "Guntakal", "Guntur", "Hindupur", "Kadapa", "Kakinada", "Kurnool", "Machilipatnam", "Madanapalle", "Nandyal", "Narasaraopet", "Nellore", "Ongole", "Proddatur", "Rajahmundry", "Srikakulam", "Tadepalligudem", "Tenali", "Tirupati", "Vijayawada", "Visakhapatnam", "Vizianagaram"],
  "Arunachal Pradesh": ["Aalo", "Bomdila", "Itanagar", "Naharlagun", "Pasighat", "Roing", "Tawang", "Tezu", "Ziro"],
  Assam: ["Barpeta", "Bongaigaon", "Dhubri", "Dibrugarh", "Diphu", "Goalpara", "Golaghat", "Guwahati", "Haflong", "Hailakandi", "Jorhat", "Karimganj", "Kokrajhar", "Lakhimpur", "Mangaldoi", "Nagaon", "Nalbari", "Sibsagar", "Silchar", "Tezpur", "Tinsukia"],
  Bihar: ["Ara", "Araria", "Aurangabad", "Bagaha", "Begusarai", "Bettiah", "Bhagalpur", "Bihar Sharif", "Buxar", "Chhapra", "Darbhanga", "Dehri", "Gaya", "Hajipur", "Jamalpur", "Jehanabad", "Katihar", "Kishanganj", "Madhubani", "Motihari", "Munger", "Muzaffarpur", "Patna", "Purnia", "Saharsa", "Samastipur", "Sasaram", "Sitamarhi", "Siwan"],
  Chandigarh: ["Chandigarh"],
  Chhattisgarh: ["Ambikapur", "Balod", "Baloda Bazar", "Bastar", "Bemetara", "Bhilai", "Bijapur", "Bilaspur", "Dantewada", "Dhamtari", "Durg", "Jagdalpur", "Janjgir", "Jashpur", "Kanker", "Kawardha", "Korba", "Koriya", "Mahasamund", "Narayanpur", "Raigarh", "Raipur", "Rajnandgaon", "Sukma", "Surajpur"],
  "Dadra and Nagar Haveli and Daman and Diu": ["Daman", "Diu", "Silvassa"],
  Delhi: ["Delhi", "New Delhi"],
  Goa: ["Bicholim", "Mapusa", "Margao", "Panaji", "Ponda", "Vasco da Gama"],
  Gujarat: ["Ahmedabad", "Amreli", "Anand", "Bharuch", "Bhavnagar", "Bhuj", "Botad", "Dahod", "Gandhidham", "Gandhinagar", "Godhra", "Himatnagar", "Jamnagar", "Junagadh", "Mehsana", "Morbi", "Nadiad", "Navsari", "Palanpur", "Patan", "Porbandar", "Rajkot", "Surat", "Surendranagar", "Vadodara", "Valsad", "Vapi", "Veraval"],
  Haryana: ["Ambala", "Bahadurgarh", "Bhiwani", "Faridabad", "Fatehabad", "Gurugram", "Hisar", "Jind", "Kaithal", "Karnal", "Kurukshetra", "Narnaul", "Palwal", "Panchkula", "Panipat", "Rewari", "Rohtak", "Sirsa", "Sonipat", "Yamunanagar"],
  "Himachal Pradesh": ["Bilaspur", "Chamba", "Dharamshala", "Hamirpur", "Kangra", "Kullu", "Mandi", "Nahan", "Shimla", "Solan", "Una"],
  "Jammu and Kashmir": ["Anantnag", "Baramulla", "Budgam", "Doda", "Ganderbal", "Jammu", "Kathua", "Kishtwar", "Kulgam", "Kupwara", "Poonch", "Pulwama", "Rajouri", "Ramban", "Samba", "Shopian", "Sopore", "Srinagar", "Udhampur"],
  Jharkhand: ["Bokaro", "Chaibasa", "Chatra", "Deoghar", "Dhanbad", "Dumka", "Giridih", "Godda", "Gumla", "Hazaribagh", "Jamshedpur", "Jamtara", "Khunti", "Koderma", "Latehar", "Lohardaga", "Pakur", "Palamu", "Ramgarh", "Ranchi", "Sahibganj", "Simdega"],
  Karnataka: ["Bagalkot", "Ballari", "Bengaluru", "Belagavi", "Bidar", "Chikkamagaluru", "Chitradurga", "Davanagere", "Dharwad", "Gadag", "Hassan", "Haveri", "Hubballi", "Kalaburagi", "Karwar", "Kolar", "Koppal", "Mandya", "Mangaluru", "Mysuru", "Raichur", "Ramanagara", "Shivamogga", "Tumakuru", "Udupi", "Vijayapura", "Yadgir"],
  Kerala: ["Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod", "Kochi", "Kollam", "Kottayam", "Kozhikode", "Malappuram", "Palakkad", "Pathanamthitta", "Thiruvananthapuram", "Thrissur", "Wayanad"],
  Ladakh: ["Kargil", "Leh"],
  Lakshadweep: ["Kavaratti"],
  "Madhya Pradesh": ["Agar Malwa", "Alirajpur", "Anuppur", "Ashoknagar", "Balaghat", "Barwani", "Betul", "Bhind", "Bhopal", "Burhanpur", "Chhatarpur", "Chhindwara", "Damoh", "Datia", "Dewas", "Dhar", "Dindori", "Guna", "Gwalior", "Harda", "Hoshangabad", "Indore", "Itarsi", "Jabalpur", "Jhabua", "Katni", "Khandwa", "Khargone", "Mandla", "Mandsaur", "Morena", "Narsinghpur", "Neemuch", "Panna", "Raisen", "Rajgarh", "Ratlam", "Rewa", "Sagar", "Satna", "Sehore", "Seoni", "Shahdol", "Shajapur", "Sheopur", "Shivpuri", "Sidhi", "Singrauli", "Tikamgarh", "Ujjain", "Umaria", "Vidisha"],
  Maharashtra: ["Ahmednagar", "Akola", "Amravati", "Aurangabad", "Baramati", "Beed", "Bhandara", "Bhiwandi", "Buldhana", "Chandrapur", "Dhule", "Gondia", "Hingoli", "Ichalkaranji", "Jalgaon", "Jalna", "Kolhapur", "Latur", "Malegaon", "Mumbai", "Nagpur", "Nanded", "Nandurbar", "Nashik", "Osmanabad", "Palghar", "Parbhani", "Pune", "Ratnagiri", "Sangli", "Satara", "Solapur", "Thane", "Ulhasnagar", "Wardha", "Washim", "Yavatmal"],
  Manipur: ["Bishnupur", "Chandel", "Churachandpur", "Imphal", "Senapati", "Tamenglong", "Thoubal", "Ukhrul"],
  Meghalaya: ["Jowai", "Nongstoin", "Shillong", "Tura", "Williamnagar"],
  Mizoram: ["Aizawl", "Champhai", "Kolasib", "Lawngtlai", "Lunglei", "Mamit", "Saiha", "Serchhip"],
  Nagaland: ["Dimapur", "Kiphire", "Kohima", "Longleng", "Mokokchung", "Mon", "Peren", "Phek", "Tuensang", "Wokha", "Zunheboto"],
  Odisha: ["Angul", "Balangir", "Balasore", "Baripada", "Bhadrak", "Bhubaneswar", "Boudh", "Cuttack", "Dhenkanal", "Jagatsinghpur", "Jajpur", "Jharsuguda", "Kalahandi", "Kendrapara", "Keonjhar", "Koraput", "Malkangiri", "Nabarangpur", "Nayagarh", "Nuapada", "Paradip", "Phulbani", "Puri", "Rayagada", "Rourkela", "Sambalpur", "Sonepur"],
  Puducherry: ["Karaikal", "Puducherry"],
  Punjab: ["Abohar", "Amritsar", "Barnala", "Batala", "Bathinda", "Faridkot", "Fatehgarh Sahib", "Fazilka", "Firozpur", "Gurdaspur", "Hoshiarpur", "Jalandhar", "Kapurthala", "Khanna", "Ludhiana", "Malerkotla", "Mansa", "Moga", "Mohali", "Muktsar", "Pathankot", "Patiala", "Phagwara", "Rupnagar", "Sangrur", "Tarn Taran"],
  Rajasthan: ["Ajmer", "Alwar", "Banswara", "Baran", "Barmer", "Beawar", "Bharatpur", "Bhilwara", "Bikaner", "Bundi", "Chittorgarh", "Churu", "Dausa", "Dholpur", "Dungarpur", "Hanumangarh", "Jaipur", "Jaisalmer", "Jalore", "Jhalawar", "Jhunjhunu", "Jodhpur", "Karauli", "Kota", "Nagaur", "Pali", "Pratapgarh", "Rajsamand", "Sawai Madhopur", "Sikar", "Sirohi", "Sri Ganganagar", "Tonk", "Udaipur"],
  Sikkim: ["Gangtok", "Namchi"],
  "Tamil Nadu": ["Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri", "Dindigul", "Erode", "Hosur", "Kanchipuram", "Karur", "Krishnagiri", "Madurai", "Nagapattinam", "Nagercoil", "Namakkal", "Perambalur", "Pudukkottai", "Ramanathapuram", "Salem", "Sivaganga", "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli", "Tirunelveli", "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Vellore", "Viluppuram", "Virudhunagar"],
  Telangana: ["Adilabad", "Hyderabad", "Jagtial", "Karimnagar", "Khammam", "Mahabubabad", "Mahbubnagar", "Mancherial", "Medak", "Nalgonda", "Nizamabad", "Ramagundam", "Sangareddy", "Siddipet", "Suryapet", "Vikarabad", "Warangal"],
  Tripura: ["Agartala", "Ambassa", "Belonia", "Dharmanagar", "Kailashahar", "Khowai", "Udaipur"],
  "Uttar Pradesh": ["Agra", "Aligarh", "Ambedkar Nagar", "Amethi", "Amroha", "Auraiya", "Ayodhya", "Azamgarh", "Baghpat", "Bahraich", "Ballia", "Balrampur", "Banda", "Barabanki", "Bareilly", "Basti", "Bhadohi", "Bijnor", "Budaun", "Bulandshahr", "Chandauli", "Deoria", "Etah", "Etawah", "Farrukhabad", "Fatehpur", "Firozabad", "Ghaziabad", "Ghazipur", "Gonda", "Gorakhpur", "Hapur", "Hardoi", "Hathras", "Jaunpur", "Jhansi", "Kannauj", "Kanpur", "Kasganj", "Kaushambi", "Kushinagar", "Lakhimpur Kheri", "Lalitpur", "Lucknow", "Mainpuri", "Mathura", "Mau", "Meerut", "Mirzapur", "Moradabad", "Muzaffarnagar", "Noida", "Orai", "Prayagraj", "Raebareli", "Rampur", "Saharanpur", "Sambhal", "Shahjahanpur", "Sitapur", "Sultanpur", "Unnao", "Varanasi"],
  Uttarakhand: ["Almora", "Bageshwar", "Chamoli", "Champawat", "Dehradun", "Haldwani", "Haridwar", "Kashipur", "Kotdwar", "Nainital", "Pauri", "Pithoragarh", "Rishikesh", "Roorkee", "Rudrapur", "Tehri", "Uttarkashi"],
  "West Bengal": ["Alipurduar", "Asansol", "Balurghat", "Bankura", "Barasat", "Bardhaman", "Berhampore", "Cooch Behar", "Darjeeling", "Durgapur", "Haldia", "Howrah", "Jalpaiguri", "Kharagpur", "Kolkata", "Krishnanagar", "Malda", "Midnapore", "Purulia", "Raiganj", "Siliguri"]
};

const STATE_OPTIONS = ["", ...Object.keys(STATE_CITY_OPTIONS)];

const LOB_OPTIONS = [
  "Motor Insurance",
  "Health Insurance",
  "Life Insurance",
  "Warehouse Insurance",
  "Fire Insurance",
  "Marine Insurance",
  "Travel Insurance",
  "Cyber Insurance",
  "Shop / Office Insurance",
  "Business Insurance",
  "Other"
];

const LOB_FIELDS = {
  "Motor Insurance": [
    ["vehicleType", "Vehicle Type"],
    ["vehicleNumber", "Vehicle Number"],
    ["existingPolicyAvailable", "Existing Policy Available?"],
    ["renewalDate", "Renewal Date", "date"]
  ],
  "Warehouse Insurance": [
    ["warehouseLocation", "Warehouse Location"],
    ["stockValue", "Stock Value"],
    ["existingInsuranceAvailable", "Existing Insurance Available?"],
    ["renewalDate", "Renewal Date", "date"]
  ],
  "Life Insurance": [
    ["age", "Age"],
    ["incomeRange", "Income Range"],
    ["familyMembers", "Family Members"],
    ["existingLifeCover", "Existing Life Cover?"]
  ],
  "Health Insurance": [
    ["familySize", "Family Size"],
    ["existingHealthCover", "Existing Health Cover?"],
    ["sumInsuredNeed", "Expected Sum Insured"],
    ["renewalDate", "Renewal Date", "date"]
  ],
  "Fire Insurance": [
    ["riskLocation", "Risk Location"],
    ["propertyValue", "Property Value"],
    ["occupancy", "Occupancy"],
    ["renewalDate", "Renewal Date", "date"]
  ],
  "Marine Insurance": [
    ["cargoType", "Cargo Type"],
    ["route", "Route"],
    ["annualTransitValue", "Annual Transit Value"],
    ["existingInsuranceAvailable", "Existing Insurance Available?"]
  ],
  "Travel Insurance": [
    ["destination", "Destination"],
    ["travelDate", "Travel Date", "date"],
    ["travellers", "Travellers"],
    ["tripDuration", "Trip Duration"]
  ],
  "Cyber Insurance": [
    ["businessWebsite", "Business Website"],
    ["dataExposure", "Customer/Data Exposure"],
    ["employeeCount", "Employee Count"],
    ["existingInsuranceAvailable", "Existing Insurance Available?"]
  ],
  "Shop / Office Insurance": [
    ["shopLocation", "Shop / Office Location"],
    ["assetValue", "Asset Value"],
    ["stockValue", "Stock Value"],
    ["renewalDate", "Renewal Date", "date"]
  ],
  "Business Insurance": [
    ["businessCategory", "Business Category"],
    ["turnoverRange", "Turnover Range"],
    ["employeeCount", "Employee Count"],
    ["keyRisk", "Key Risk"]
  ],
  Other: [
    ["insuranceNeed", "Insurance Need"],
    ["estimatedValue", "Estimated Value"],
    ["notes", "Notes"]
  ]
};

export default function CustomerProfilingPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedExistingId, setSelectedExistingId] = useState("");
  const [convertType, setConvertType] = useState("");
  const [followUpDraft, setFollowUpDraft] = useState("");
  const [followUpMeta, setFollowUpMeta] = useState({
    outcome: "Call Back Later",
    mode: "Call",
    priority: "Normal",
    nextFollowUpDate: "",
    policyInterest: "",
    status: "Follow-up Required"
  });
  const [searchResults, setSearchResults] = useState(EMPTY_SEARCH_RESULTS);
  const [profiles, setProfiles] = useState([]);
  const [counters, setCounters] = useState(EMPTY_COUNTERS);
  const [filterOptions, setFilterOptions] = useState({ assignedTo: [], lobs: [] });
  const [currentUser, setCurrentUser] = useState(null);
  const [filters, setFilters] = useState({
    q: "",
    status: "",
    assignedTo: "",
    lob: "",
    followUpDate: ""
  });
  const [alert, setAlert] = useState(null);
  const [isPending, startTransition] = useTransition();
  const [conversionModalData, setConversionModalData] = useState(null);

  const phone = form.phone.replace(/\D/g, "").slice(0, 10);
  const isValidProfilePhone = phone.length === 10;
  const hasMatches = searchResults.profiles.length > 0 || searchResults.policyMatches.length > 0;
  const isClaimedByAnotherUser = Boolean(searchResults.claimedByAnotherUser);
  const hasExternalMatches = isClaimedByAnotherUser || (hasMatches && searchResults.profiles.some((profile) => !canCurrentUserHandleProfile(profile, currentUser)));
  const cityOptions = useMemo(() => {
    return ["", ...new Set([...(STATE_CITY_OPTIONS[form.state] || []), form.city].filter(Boolean))];
  }, [form.state, form.city]);
  const assignedNames = useMemo(() => {
    return [
      ...searchResults.profiles.map((item) => item.assignedTo || item.createdBy)
    ].filter(Boolean);
  }, [searchResults]);

  useEffect(() => {
    loadProfiles();
    loadCurrentUser();
  }, [filters.q, filters.status, filters.assignedTo, filters.lob, filters.followUpDate]);

  useEffect(() => {
    if (!isValidProfilePhone) {
      setSearchResults(EMPTY_SEARCH_RESULTS);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(`/api/customer-profiles?phone=${encodeURIComponent(phone)}`, {
          signal: controller.signal
        });
        if (!response.ok) return;
        setSearchResults(await response.json());
      } catch (error) {
        if (error.name !== "AbortError") {
          setAlert({ type: "error", message: "Phone duplicate check failed." });
        }
      }
    }, 350);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [phone, isValidProfilePhone]);

  function updateField(key, value) {
    if (key === "phone" || key === "alternatePhone") {
      setForm((current) => ({ ...current, [key]: value.replace(/\D/g, "").slice(0, 10) }));
      return;
    }
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateState(value) {
    setForm((current) => ({ ...current, state: value, city: "" }));
  }

  function toggleLob(lob) {
    setForm((current) => {
      const selected = new Set(current.selectedLOBs || []);
      if (selected.has(lob)) selected.delete(lob);
      else selected.add(lob);
      return { ...current, selectedLOBs: [...selected] };
    });
  }

  function updateLobField(lob, key, value) {
    setForm((current) => ({
      ...current,
      lobDetails: {
        ...(current.lobDetails || {}),
        [lob]: {
          ...(current.lobDetails?.[lob] || {}),
          [key]: value
        }
      }
    }));
  }

  function openProfile(profile) {
    setSelectedExistingId(profile.id);
    setConvertType("");
    setFollowUpDraft("");
    setFollowUpMeta({
      outcome: profile.followUpOutcome || "Call Back Later",
      mode: "Call",
      priority: "Normal",
      nextFollowUpDate: profile.nextFollowUpDate ? new Date(profile.nextFollowUpDate).toISOString().slice(0, 10) : "",
      policyInterest: profile.selectedLOBs?.[0] || "",
      status: profile.status || "Follow-up Required"
    });
    setForm({
      ...EMPTY_FORM,
      ...profile,
      followUpDate: profile.followUpDate ? new Date(profile.followUpDate).toISOString().slice(0, 10) : "",
      lastFollowUpDate: profile.lastFollowUpDate ? new Date(profile.lastFollowUpDate).toISOString().slice(0, 10) : "",
      nextFollowUpDate: profile.nextFollowUpDate ? new Date(profile.nextFollowUpDate).toISOString().slice(0, 10) : "",
      selectedLOBs: profile.selectedLOBs || [],
      lobDetails: profile.lobDetails || {}
    });
  }

  function usePolicyLead(record) {
    const inferredLob = inferLobFromPolicyType(record.policyType);
    setSelectedExistingId("");
    setConvertType("");
    setFollowUpDraft("");
    setFollowUpMeta({
      outcome: "Call Back Later",
      mode: "Call",
      priority: "Normal",
      nextFollowUpDate: "",
      policyInterest: inferredLob || "",
      status: "Follow-up Required"
    });
    setForm({
      ...EMPTY_FORM,
      name: record.name || "",
      phone: record.phone || phone,
      customerType: "Existing",
      assignedTo: record.assignedTo || currentUser?.name || "",
      referenceSource: "Policy Record",
      sourcePolicyId: record.id || "",
      sourcePolicyNumber: record.policyNumber || "",
      sourcePolicyType: record.policyType || "",
      sourceCompany: record.insuranceCompany || "",
      selectedLOBs: inferredLob ? [inferredLob] : [],
      lobDetails: {},
      remarks: [record.policyNumber ? `Source policy ${record.policyNumber}` : "", record.policyType, record.insuranceCompany].filter(Boolean).join(" / ")
    });
    setAlert({ type: "success", message: "Policy customer loaded into the lead form. Save Profile to add it to Customer Profiling." });
  }

  function newProfile() {
    setSelectedExistingId("");
    setConvertType("");
    setFollowUpDraft("");
    setFollowUpMeta({
      outcome: "Call Back Later",
      mode: "Call",
      priority: "Normal",
      nextFollowUpDate: "",
      policyInterest: "",
      status: "Follow-up Required"
    });
    setForm(EMPTY_FORM);
    setSearchResults(EMPTY_SEARCH_RESULTS);
  }

  async function loadProfiles() {
    const params = new window.URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    const response = await fetch(`/api/customer-profiles?${params.toString()}`);
    if (!response.ok) return;
    const payload = await response.json();
    setProfiles(payload.profiles || []);
    setCounters(payload.counters || EMPTY_COUNTERS);
    setFilterOptions(payload.filterOptions || { assignedTo: [], lobs: [] });
  }

  async function loadCurrentUser() {
    if (currentUser) return;
    const response = await fetch("/api/auth/me");
    if (!response.ok) return;
    const payload = await response.json().catch(() => ({}));
    if (payload.success) setCurrentUser(payload.user);
  }

  function submitProfile() {
    startTransition(async () => {
      setAlert(null);
      try {
        if (form.phone && form.phone.replace(/\D/g, "").length !== 10) {
          setAlert({ type: "error", message: "Phone number must be exactly 10 digits." });
          return;
        }
        if (!selectedExistingId && searchResults.claimedByAnotherUser) {
          setAlert({ type: "error", message: "This phone number is already claimed by another user in Customer Profiling." });
          return;
        }
        const response = await fetch(selectedExistingId ? `/api/customer-profiles/${selectedExistingId}` : "/api/customer-profiles", {
          method: selectedExistingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form)
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          if (response.status === 409 && payload.profile) {
            openProfile(payload.profile);
          }
          setAlert({ type: "error", message: payload.error || "Customer profile could not be saved." });
          return;
        }
        if (selectedExistingId) {
          openProfile(payload);
        } else {
          setForm(EMPTY_FORM);
        }
        setSearchResults(EMPTY_SEARCH_RESULTS);
        setAlert({ type: "success", message: selectedExistingId ? "Customer profile details updated." : "Customer profile saved. Click View More to fill full details on the right." });
        await loadProfiles();
      } catch (error) {
        setAlert({ type: "error", message: error.message || "Customer profile could not be saved." });
      }
    });
  }

  const generateMessageText = (profile, conversionType) => {
    if (!profile) return "";
    let lines = [];
    lines.push(`*CONVERTED LEAD DETAILS*`);
    lines.push(`*Name*: ${profile.name || "-"}`);
    lines.push(`*Phone*: ${profile.phone || "-"}`);
    if (profile.email) lines.push(`*Email*: ${profile.email}`);
    if (profile.city || profile.state) lines.push(`*Location*: ${[profile.city, profile.state].filter(Boolean).join(", ")}`);
    if (profile.address) lines.push(`*Address*: ${profile.address}`);
    lines.push(`*Policy Interest*: ${conversionType || "General Insurance"}`);
    
    if (conversionType && LOB_FIELDS[conversionType]) {
      lines.push(`\n*Details*:`);
      LOB_FIELDS[conversionType].forEach(([key, label, type]) => {
        const val = profile.lobDetails?.[conversionType]?.[key];
        let displayVal = val || "-";
        if (type === "date" && val) {
          displayVal = formatDate(val);
        }
        lines.push(`- ${label}: ${displayVal}`);
      });
    }

    if (profile.remarks) {
      lines.push(`\n*Remarks*: ${profile.remarks}`);
    }

    return lines.join("\n");
  };

  const handlePrintProfile = (profile, conversionType) => {
    if (!profile) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.alert("Please allow popups to print lead details.");
      return;
    }

    const renderPrintSection = (title, fields) => {
      const validFields = fields.filter(([_, val]) => val !== undefined && val !== null && String(val).trim() !== "");
      if (validFields.length === 0) return "";
      return `
        <div class="section">
          <h3>${title}</h3>
          <div class="grid">
            ${validFields.map(([lbl, val]) => `
              <div class="field">
                <span class="label">${lbl}</span>
                <span class="value">${val}</span>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    };

    const generalFields = [
      ["Name", profile.name],
      ["Phone", profile.phone],
      ["Alternate Phone", profile.alternatePhone],
      ["Email", profile.email],
      ["State", profile.state],
      ["City", profile.city],
      ["Address", profile.address],
      ["Occupation", profile.occupation],
      ["Business Type", profile.businessType],
      ["Assigned To", profile.assignedTo],
      ["Reference Source", profile.referenceSource],
      ["Status", "Converted"],
      ["Conversion Target LOB", conversionType]
    ];

    const lobFields = [];
    if (conversionType && LOB_FIELDS[conversionType]) {
      LOB_FIELDS[conversionType].forEach(([key, label, type]) => {
        const val = profile.lobDetails?.[conversionType]?.[key];
        let displayVal = val;
        if (type === "date" && val) {
          displayVal = formatDate(val);
        }
        lobFields.push([label, displayVal]);
      });
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Converted Lead - ${profile.name || "Details"}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #0f172a;
              padding: 24px;
              line-height: 1.4;
              margin: 0;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #1e3a8a;
              padding-bottom: 12px;
              margin-bottom: 20px;
            }
            .header h1 {
              margin: 0;
              font-size: 22px;
              font-weight: 800;
              color: #1e3a8a;
            }
            .header p {
              margin: 4px 0 0;
              color: #64748b;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 1px;
              font-weight: 700;
            }
            .section {
              margin-bottom: 20px;
              page-break-inside: avoid;
            }
            .section h3 {
              margin: 0 0 10px;
              font-size: 14px;
              font-weight: 700;
              color: #0f172a;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 6px;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 12px;
            }
            .field {
              padding: 8px 12px;
              background: #f8fafc;
              border: 1px solid #f1f5f9;
              border-radius: 6px;
            }
            .label {
              font-size: 9px;
              font-weight: 600;
              color: #64748b;
              text-transform: uppercase;
              display: block;
              margin-bottom: 2px;
            }
            .value {
              font-size: 12px;
              font-weight: 600;
              color: #0f172a;
            }
            @media print {
              .field {
                background: #f8fafc !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>Lead Converted Successfully</h1>
              <p>Conversion details for team handoff</p>
            </div>
          </div>
          
          ${renderPrintSection("General Client Information", generalFields)}
          ${lobFields.length ? renderPrintSection(`${conversionType} Details`, lobFields) : ""}
          
          ${profile.remarks ? `
            <div class="section">
              <h3>Remarks</h3>
              <div class="field" style="background: #fffbeb; border-color: #fef3c7;">
                <span class="value" style="font-weight: 500;">${profile.remarks}</span>
              </div>
            </div>
          ` : ""}

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  function convertProfile() {
    const conversionType = convertType || form.selectedLOBs?.[0] || "General Insurance";
    if (!selectedExistingId) {
      setAlert({ type: "error", message: "Open a saved profile first." });
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/customer-profiles/${selectedExistingId}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ insuranceType: conversionType })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setAlert({ type: "error", message: payload.error || "Conversion could not be started." });
        return;
      }
      setConversionModalData({
        profile: form,
        conversionType: conversionType
      });
      setAlert({ type: "success", message: "Customer profile converted successfully!" });
      await loadProfiles();
    });
  }

  function saveFollowUpRemark() {
    const remark = followUpDraft.trim();
    if (!selectedExistingId || !remark) {
      setAlert({ type: "error", message: "Open a saved profile and enter a follow-up remark first." });
      return;
    }

    const metadataLines = [
      `Outcome: ${followUpMeta.outcome || "-"}`,
      `Contact Mode: ${followUpMeta.mode || "-"}`,
      `Priority: ${followUpMeta.priority || "-"}`,
      `Lead Status: ${followUpMeta.status || "-"}`,
      `Policy Interest: ${followUpMeta.policyInterest || "-"}`,
      `Next Follow-up Date: ${followUpMeta.nextFollowUpDate ? formatDate(followUpMeta.nextFollowUpDate) : "-"}`
    ];
    if (followUpMeta.policyInterest && LOB_FIELDS[followUpMeta.policyInterest]) {
      LOB_FIELDS[followUpMeta.policyInterest].forEach(([key, label, type]) => {
        const val = form.lobDetails?.[followUpMeta.policyInterest]?.[key];
        let displayVal = val || "-";
        if (type === "date" && val) {
          displayVal = formatDate(val);
        }
        metadataLines.push(`${label}: ${displayVal}`);
      });
    }
    const remarkWithMetadata = `${metadataLines.join("\n")}\n\nRemark: ${remark}`;

    const entry = {
      id: `${Date.now()}`,
      remark: remarkWithMetadata,
      rawRemark: remark,
      outcome: followUpMeta.outcome,
      mode: followUpMeta.mode,
      priority: followUpMeta.priority,
      nextFollowUpDate: followUpMeta.nextFollowUpDate,
      policyInterest: followUpMeta.policyInterest,
      status: followUpMeta.status,
      createdAt: new Date().toISOString(),
      createdBy: form.assignedTo || "Agent"
    };
    const nextForm = {
      ...form,
      followUpRemark: remarkWithMetadata,
      followUpOutcome: followUpMeta.outcome,
      lastFollowUpDate: new Date().toISOString().slice(0, 10),
      nextFollowUpDate: followUpMeta.nextFollowUpDate,
      status: followUpMeta.status || form.status,
      selectedLOBs: followUpMeta.policyInterest && !form.selectedLOBs.includes(followUpMeta.policyInterest)
        ? [...form.selectedLOBs, followUpMeta.policyInterest]
        : form.selectedLOBs,
      lobDetails: {
        ...(form.lobDetails || {}),
        followUps: [...(Array.isArray(form.lobDetails?.followUps) ? form.lobDetails.followUps : []), entry]
      }
    };

    startTransition(async () => {
      const response = await fetch(`/api/customer-profiles/${selectedExistingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextForm)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setAlert({ type: "error", message: payload.error || "Follow-up remark could not be saved." });
        return;
      }
      openProfile(payload);
      setFollowUpDraft("");
      setFollowUpMeta((current) => ({ ...current, nextFollowUpDate: "" }));
      setAlert({ type: "success", message: "Follow-up remark saved." });
      await loadProfiles();
    });
  }

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="customer-profiling-page">
      <PageHeader
        eyebrow="Manual Entry"
        title="Customer Profiling"
        subtitle="Create cross-sell and follow-up profiles before converting them into policy work."
      />

      {alert ? (
        <div className={`customer-profile-alert ${alert.type}`}>
          {alert.type === "success" ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span>{alert.message}</span>
        </div>
      ) : null}

      <section className="profile-counter-grid">
        <CounterCard label="Total Profiles" value={counters.totalProfiles} />
        <CounterCard label="New Leads" value={counters.newLeads} />
        <CounterCard label="Follow-up Required" value={counters.followUpRequired} />
        <CounterCard label="Interested" value={counters.interested} />
        <CounterCard label="Converted" value={counters.converted} />
        <CounterCard label="Lost" value={counters.lost} />
      </section>

      <section className="customer-profile-card">
        <div className="customer-profile-section-head">
          <div>
            <h2>Customer Profile Check</h2>
            <p>Enter phone number to check whether another agent is already handling this profiling lead.</p>
          </div>
          <div className="profile-table-actions">
            <button type="button" onClick={newProfile}>New Profile</button>
            <Search size={20} />
          </div>
        </div>
        <div className="customer-profile-grid two">
          <Field label="Phone Number" value={form.phone} onChange={(value) => updateField("phone", value)} />
          <SelectField label="Customer Type" value={form.customerType} options={CUSTOMER_TYPES} onChange={(value) => updateField("customerType", value)} />
        </div>

        {hasMatches || isClaimedByAnotherUser ? (
          <div className={hasExternalMatches ? "duplicate-warning" : "duplicate-clear"}>
            {hasExternalMatches ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
            <div>
              <strong>{isClaimedByAnotherUser ? "This phone number is already claimed in Customer Profiling." : hasExternalMatches ? "This phone number is being handled by another user." : "This phone number has matching records."}</strong>
              <p>{isClaimedByAnotherUser ? "Another user has already added this lead. You cannot view or add it from this page." : hasExternalMatches ? "Check the existing lead before creating another follow-up." : "Select an existing profile or policy customer to create a lead."}</p>
              {!isClaimedByAnotherUser && hasExternalMatches && assignedNames[0] ? <p>Existing follow-up is being handled by {assignedNames[0]}.</p> : null}
            </div>
          </div>
        ) : isValidProfilePhone ? (
          <div className="duplicate-clear">
            <CheckCircle size={18} /> No matching Customer Profile found. You can add this client.
          </div>
        ) : phone.length ? (
          <div className="customer-profile-alert error">
            <AlertTriangle size={18} /> Phone number must be exactly 10 digits.
          </div>
        ) : null}

        {hasMatches ? (
          <ExistingCustomerTable
            profiles={searchResults.profiles}
            policyMatches={searchResults.policyMatches}
            onSelectProfile={openProfile}
            onSelectPolicy={usePolicyLead}
          />
        ) : null}
      </section>

      <div className="customer-profile-workspace">
        <section className={`customer-profile-card customer-profile-list-panel ${selectedExistingId ? "followup-active" : ""}`}>
          <div className="customer-profile-section-head">
            <div>
              <h2>{selectedExistingId ? `${form.name || "Customer"} Follow-up` : "Saved Customer Profiles"}</h2>
              <p>{selectedExistingId ? "Save every follow-up remark for this client." : "Review added clients and open follow-up chat with View More."}</p>
            </div>
            {selectedExistingId ? <button type="button" onClick={() => setSelectedExistingId("")}>Back to Table</button> : null}
          </div>
          {selectedExistingId ? (
            <>
              <div className="followup-chat-thread">
                {Array.isArray(form.lobDetails?.followUps) && form.lobDetails.followUps.length ? (
                  form.lobDetails.followUps.map((entry) => (
                    <div className="followup-message" key={entry.id || entry.createdAt}>
                      <div>
                        <strong>{entry.createdBy || "Agent"}</strong>
                        <span>{formatDateTime(entry.createdAt)}</span>
                      </div>
                      <div className="followup-tags">
                        {entry.outcome ? <em>{entry.outcome}</em> : null}
                        {entry.mode ? <em>{entry.mode}</em> : null}
                        {entry.priority ? <em>{entry.priority}</em> : null}
                        {entry.policyInterest ? <em>{entry.policyInterest}</em> : null}
                        {entry.nextFollowUpDate ? <em>Next: {formatDate(entry.nextFollowUpDate)}</em> : null}
                      </div>
                      <p>{entry.remark}</p>
                    </div>
                  ))
                ) : (
                  <div className="followup-empty">No follow-up remarks saved yet.</div>
                )}
              </div>

              <div className="followup-compose">
                <div className="followup-meta-grid">
                  <label>
                    <span>Outcome</span>
                    <select value={followUpMeta.outcome} onChange={(event) => setFollowUpMeta((current) => ({ ...current, outcome: event.target.value }))}>
                      {FOLLOW_UP_OUTCOMES.filter(Boolean).map((outcome) => <option key={outcome} value={outcome}>{outcome}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Contact Mode</span>
                    <select value={followUpMeta.mode} onChange={(event) => setFollowUpMeta((current) => ({ ...current, mode: event.target.value }))}>
                      {FOLLOW_UP_MODES.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Priority</span>
                    <select value={followUpMeta.priority} onChange={(event) => setFollowUpMeta((current) => ({ ...current, priority: event.target.value }))}>
                      {FOLLOW_UP_PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Lead Status</span>
                    <select value={followUpMeta.status} onChange={(event) => setFollowUpMeta((current) => ({ ...current, status: event.target.value }))}>
                      {PROFILE_STATUS.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Policy Interest</span>
                    <select value={followUpMeta.policyInterest} onChange={(event) => setFollowUpMeta((current) => ({ ...current, policyInterest: event.target.value }))}>
                      <option value="">Policy interest</option>
                      {LOB_OPTIONS.map((lob) => <option key={lob} value={lob}>{lob}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Next Follow-up Date</span>
                    <input type="date" value={followUpMeta.nextFollowUpDate} onChange={(event) => setFollowUpMeta((current) => ({ ...current, nextFollowUpDate: event.target.value }))} />
                  </label>
                </div>
                {followUpMeta.policyInterest && LOB_FIELDS[followUpMeta.policyInterest] ? (
                  <fieldset className="lob-detail-card" style={{ margin: "14px 0", border: "1px dashed rgba(25, 28, 29, 0.2)", padding: "16px", borderRadius: "12px", background: "#fafafa" }}>
                    <legend style={{ fontWeight: "700", textTransform: "uppercase", fontSize: "11px", padding: "0 8px", color: "var(--primary)", letterSpacing: "0.5px" }}>
                      {followUpMeta.policyInterest} Details
                    </legend>
                    <div className="customer-profile-grid two" style={{ gap: "12px" }}>
                      {LOB_FIELDS[followUpMeta.policyInterest].map(([key, label, type]) => (
                        <Field
                          key={key}
                          label={label}
                          type={type || "text"}
                          value={form.lobDetails?.[followUpMeta.policyInterest]?.[key] || ""}
                          onChange={(value) => updateLobField(followUpMeta.policyInterest, key, value)}
                        />
                      ))}
                    </div>
                  </fieldset>
                ) : null}
                <textarea value={followUpDraft} placeholder="Type follow-up remark..." onChange={(event) => setFollowUpDraft(event.target.value)} />
                <button type="button" onClick={saveFollowUpRemark} disabled={isPending}>Save Remark</button>
              </div>
            </>
          ) : (
            <>
              <div className="customer-profile-filters">
                <input value={filters.q} placeholder="Search name or phone" onChange={(event) => updateFilter("q", event.target.value)} />
                <select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
                  <option value="">All Statuses</option>
                  {PROFILE_STATUS.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
                <select value={filters.assignedTo} onChange={(event) => updateFilter("assignedTo", event.target.value)}>
                  <option value="">All Assigned To</option>
                  {filterOptions.assignedTo.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
                <select value={filters.lob} onChange={(event) => updateFilter("lob", event.target.value)}>
                  <option value="">All LOBs</option>
                  {[...new Set([...LOB_OPTIONS, ...(filterOptions.lobs || [])])].map((lob) => <option key={lob} value={lob}>{lob}</option>)}
                </select>
                <input type="date" value={filters.followUpDate} onChange={(event) => updateFilter("followUpDate", event.target.value)} />
              </div>
              <ProfileListingTable
                profiles={profiles}
                onEdit={openProfile}
              />
            </>
          )}
        </section>

        <aside className="customer-profile-editor-panel">
          {!selectedExistingId ? (
            <>
              <section className="customer-profile-card compact-profile-form">
                <div className="customer-profile-section-head">
                  <div>
                    <h2>New Customer Profile</h2>
                    <p>Add basic client details here.</p>
                  </div>
                  <UserPlus size={20} />
                </div>

                {form.sourcePolicyId ? (
                  <div className="source-policy-strip">
                    <span>Policy source</span>
                    <strong>{form.sourcePolicyNumber || "Existing policy record"}</strong>
                    {form.sourcePolicyType ? <span>{form.sourcePolicyType}</span> : null}
                    {form.sourceCompany ? <span>{form.sourceCompany}</span> : null}
                  </div>
                ) : null}

                <div className="customer-profile-grid">
                  <Field label="Customer Name" value={form.name} onChange={(value) => updateField("name", value)} />
                  <Field label="Alternate Phone Number" value={form.alternatePhone} onChange={(value) => updateField("alternatePhone", value)} />
                  <Field label="Email" value={form.email} onChange={(value) => updateField("email", value)} />
                  <SelectField label="State" value={form.state} options={STATE_OPTIONS} onChange={updateState} />
                  <SelectField label="City" value={form.city} options={cityOptions} onChange={(value) => updateField("city", value)} />
                  <Field label="Occupation / Business Type" value={form.occupation} onChange={(value) => updateField("occupation", value)} />
                  <Field label="Business Type" value={form.businessType} onChange={(value) => updateField("businessType", value)} />
                  <Field label="Contact Person Name" value={form.contactPersonName} onChange={(value) => updateField("contactPersonName", value)} />
                  <Field label="Reference Source" value={form.referenceSource} onChange={(value) => updateField("referenceSource", value)} />
                  <Field label="Assigned To" value={form.assignedTo} onChange={(value) => updateField("assignedTo", value)} />
                  <Field label="Address" wide value={form.address} onChange={(value) => updateField("address", value)} />
                  <Field label="Remark" wide value={form.remarks} onChange={(value) => updateField("remarks", value)} />
                </div>
              </section>
              <section className="customer-profile-actions">
                <button type="button" onClick={submitProfile} disabled={isPending}>
                  Save Profile
                </button>
              </section>
            </>
          ) : (
            <>
              <section className="customer-profile-card compact-profile-form">
                <div className="customer-profile-section-head">
                  <div>
                    <h2>Customer Details</h2>
                    <p>{[form.phone, form.assignedTo].filter(Boolean).join(" / ") || "Selected customer details."}</p>
                  </div>
                </div>
                <div className="customer-profile-grid">
                  <Field label="Customer Name" value={form.name} onChange={(value) => updateField("name", value)} />
                  <Field label="Phone" value={form.phone} onChange={(value) => updateField("phone", value)} />
                  <Field label="Assigned To" value={form.assignedTo} onChange={(value) => updateField("assignedTo", value)} />
                  <Field label="Remark" wide value={form.remarks} onChange={(value) => updateField("remarks", value)} />
                </div>
              </section>

              <section className="customer-profile-card compact-profile-form">
                <div className="customer-profile-section-head">
                  <div>
                    <h2>Policy Interest Details</h2>
                    <p>Select the client interest and capture the required discussion details.</p>
                  </div>
                </div>
                <div className="lob-checklist">
                  {LOB_OPTIONS.map((lob) => (
                    <label key={lob}>
                      <input type="checkbox" checked={form.selectedLOBs.includes(lob)} onChange={() => toggleLob(lob)} />
                      <span>{lob}</span>
                    </label>
                  ))}
                </div>

                {form.selectedLOBs.map((lob) => (
                  <fieldset key={lob} className="lob-detail-card">
                    <legend>{lob}</legend>
                    <div className="customer-profile-grid">
                      {(LOB_FIELDS[lob] || LOB_FIELDS.Other).map(([key, label, type]) => (
                        <Field
                          key={key}
                          label={label}
                          type={type || "text"}
                          value={form.lobDetails?.[lob]?.[key] || ""}
                          onChange={(value) => updateLobField(lob, key, value)}
                        />
                      ))}
                    </div>
                  </fieldset>
                ))}

                <div className="customer-profile-grid">
                  <Field label="Policy Interest Remark" wide value={form.followUpRemark} onChange={(value) => updateField("followUpRemark", value)} />
                </div>
                <div className="customer-profile-actions inline-actions">
                  <button type="button" onClick={submitProfile} disabled={isPending}>Save Interest Details</button>
                  <select value={convertType} onChange={(event) => setConvertType(event.target.value)}>
                    <option value="">Select converted policy type</option>
                    {form.selectedLOBs.map((lob) => (
                      <option key={lob} value={lob}>{lob}</option>
                    ))}
                  </select>
                  <button className="secondary-action" type="button" onClick={convertProfile} disabled={isPending}>
                    Convert Lead
                  </button>
                </div>
              </section>
            </>
          )}
        </aside>
      </div>

      {typeof window !== "undefined" && conversionModalData && createPortal(
        <div
          className="tb-modal-backdrop"
          onClick={() => setConversionModalData(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.25)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px"
          }}
        >
          <div
            className="tb-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#ffffff",
              borderRadius: "24px",
              boxShadow: "0 25px 70px -10px rgba(0, 0, 0, 0.08), 0 10px 30px -15px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(0, 0, 0, 0.03)",
              width: "100%",
              maxWidth: "600px",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              border: "none",
              animation: "modal-pop 320ms cubic-bezier(0.2, 0, 0, 1) both"
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "20px 24px",
                borderBottom: "1px solid #f1f5f9"
              }}
            >
              <div>
                <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px", color: "var(--primary)" }}>Lead Converted</span>
                <h2 style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: "850", color: "#0f172a" }}>
                  Team Handoff Options
                </h2>
              </div>
              <button
                onClick={() => setConversionModalData(null)}
                aria-label="Close"
                style={{
                  background: "rgba(15, 23, 42, 0.05)",
                  border: "none",
                  color: "#64748b",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  transition: "background-color 0.2s"
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
              <p style={{ margin: 0, fontSize: "14px", color: "#475569", lineHeight: "1.5" }}>
                This lead has been successfully marked as <strong>Converted</strong>. You can now format a message for WhatsApp / team share, or print a summary for handoff.
              </p>

              {/* Message Preview Textarea */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "12px", fontWeight: "700", color: "#64748b" }}>Message Summary Preview</span>
                <textarea
                  readOnly
                  value={generateMessageText(conversionModalData.profile, conversionModalData.conversionType)}
                  style={{
                    width: "100%",
                    height: "180px",
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    background: "#f8fafc",
                    fontFamily: "monospace",
                    fontSize: "12px",
                    color: "#334155",
                    resize: "none"
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <button
                  type="button"
                  onClick={() => {
                    const text = generateMessageText(conversionModalData.profile, conversionModalData.conversionType);
                    if (typeof window !== "undefined" && window.navigator && window.navigator.clipboard) {
                      window.navigator.clipboard.writeText(text);
                      alert("Message summary copied to clipboard!");
                    } else {
                      alert("Clipboard copy not supported in this browser. Please copy the preview manually.");
                    }
                  }}
                  style={{
                    padding: "12px",
                    borderRadius: "12px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                    color: "#0f172a",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px"
                  }}
                >
                  Copy Message
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const text = generateMessageText(conversionModalData.profile, conversionModalData.conversionType);
                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
                  }}
                  style={{
                    padding: "12px",
                    borderRadius: "12px",
                    border: "none",
                    backgroundColor: "#25D366",
                    color: "#ffffff",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px"
                  }}
                >
                  Send on WhatsApp
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 24px",
                borderTop: "1px solid #f1f5f9"
              }}
            >
              <button
                type="button"
                onClick={() => handlePrintProfile(conversionModalData.profile, conversionModalData.conversionType)}
                style={{
                  padding: "10px 20px",
                  borderRadius: "12px",
                  border: "1px solid var(--primary)",
                  backgroundColor: "#ffffff",
                  color: "var(--primary)",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                Print Summary
              </button>
              <button
                type="button"
                onClick={() => setConversionModalData(null)}
                style={{
                  padding: "10px 20px",
                  borderRadius: "12px",
                  border: "none",
                  backgroundColor: "var(--primary)",
                  color: "#ffffff",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
}

function CounterCard({ label, value }) {
  return (
    <div className="profile-counter-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ProfileListingTable({ profiles, onEdit }) {
  return (
    <div className="existing-customer-table">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Customer Type</th>
            <th>Selected LOBs</th>
            <th>Status</th>
            <th>Assigned To</th>
            <th>Follow-up Date</th>
            <th>Converted</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {profiles.length ? profiles.map((profile) => (
            <tr key={profile.id}>
              <td>{profile.name || "-"}</td>
              <td>{profile.phone || "-"}</td>
              <td>{profile.customerType || "-"}</td>
              <td>{(profile.selectedLOBs || []).join(", ") || "-"}</td>
              <td>{profile.status || "-"}</td>
              <td>{profile.assignedTo || "-"}</td>
              <td>{formatDate(profile.nextFollowUpDate || profile.followUpDate)}</td>
              <td>{profile.convertedToCustomer ? "Yes" : "No"}</td>
              <td>
                <div className="profile-table-actions">
                  <button type="button" onClick={() => onEdit(profile)}>View More</button>
                </div>
              </td>
            </tr>
          )) : (
            <tr>
              <td colSpan={9} className="empty">No customer profiles found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN");
}

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function canCurrentUserHandleProfile(profile, user) {
  if (!user) return false;
  if (user.role === "SUPER_ADMIN") return true;
  const userTokens = [user.name, user.email].filter(Boolean).map((value) => value.toLowerCase());
  const ownerTokens = [profile.assignedTo, profile.createdBy].filter(Boolean).map((value) => value.toLowerCase());
  return ownerTokens.some((owner) => userTokens.includes(owner));
}

function ExistingCustomerTable({ profiles, policyMatches, onSelectProfile, onSelectPolicy }) {
  return (
    <div className="existing-customer-table">
      <table>
        <thead>
          <tr>
            <th>Source</th>
            <th>Customer</th>
            <th>Phone</th>
            <th>Known Insurance / LOB</th>
            <th>Assigned To</th>
            <th>Remarks</th>
            <th>Select</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map((profile) => (
            <tr key={`profile-${profile.id}`}>
              <td>Profile</td>
              <td>{profile.name}</td>
              <td>{profile.phone}</td>
              <td>{(profile.selectedLOBs || []).join(", ") || "-"}</td>
              <td>{profile.assignedTo || profile.createdBy || "-"}</td>
              <td>{profile.remarks || "-"}</td>
              <td><button type="button" onClick={() => onSelectProfile(profile)}>Use Lead</button></td>
            </tr>
          ))}
          {policyMatches.map((record) => (
            <tr key={`policy-${record.id}`}>
              <td>Policy</td>
              <td>{record.name || "-"}</td>
              <td>{record.phone || "-"}</td>
              <td>{[record.policyType, record.insuranceCompany].filter(Boolean).join(" / ") || "-"}</td>
              <td>{record.assignedTo || "-"}</td>
              <td>{record.remarks || record.policyNumber || "-"}</td>
              <td><button type="button" onClick={() => onSelectPolicy(record)}>Select Lead</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function inferLobFromPolicyType(policyType = "") {
  const normalized = policyType.toLowerCase();
  if (!normalized) return "";
  const match = LOB_OPTIONS.find((lob) => {
    const [keyword] = lob.toLowerCase().split(" insurance");
    return keyword && normalized.includes(keyword);
  });
  if (match) return match;
  if (normalized.includes("vehicle") || normalized.includes("car") || normalized.includes("bike")) return "Motor Insurance";
  if (normalized.includes("medical") || normalized.includes("mediclaim")) return "Health Insurance";
  if (normalized.includes("shop") || normalized.includes("office")) return "Shop / Office Insurance";
  return "Other";
}

function Field({ label, value, onChange, type = "text", wide = false }) {
  const input = wide ? (
    <textarea value={value || ""} onChange={(event) => onChange(event.target.value)} />
  ) : (
    <input type={type} value={value || ""} onChange={(event) => onChange(event.target.value)} />
  );

  return (
    <label className={wide ? "wide" : ""}>
      <span>{label}</span>
      {input}
    </label>
  );
}

function SelectField({ label, value, options, onChange }) {
  return (
    <label>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}
