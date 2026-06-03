"use client";

/* global AbortController, clearTimeout */
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle, Search, UserPlus } from "lucide-react";
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

const AGENT_JOURNEY_STEPS = [
  ["1", "Enter phone", "Check whether this number is already in Customer Profiling."],
  ["2", "Add client", "Capture basic profile details and assign the owner."],
  ["3", "Save profile", "Store the client separately from policy records."],
  ["4", "View more", "Open the full profile page before calling the client."],
  ["5", "Discuss need", "Select policy interest and capture required details after the call."],
  ["6", "Upload policy", "When converted, send the agent to policy upload."]
];

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
  const router = useRouter();
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
  const [searchResults, setSearchResults] = useState({ profiles: [], policyMatches: [] });
  const [profiles, setProfiles] = useState([]);
  const [counters, setCounters] = useState(EMPTY_COUNTERS);
  const [filterOptions, setFilterOptions] = useState({ assignedTo: [], lobs: [] });
  const [filters, setFilters] = useState({
    q: "",
    status: "",
    assignedTo: "",
    lob: "",
    followUpDate: ""
  });
  const [alert, setAlert] = useState(null);
  const [isPending, startTransition] = useTransition();

  const phone = form.phone.replace(/\D/g, "");
  const hasMatches = searchResults.profiles.length > 0;
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
  }, [filters.q, filters.status, filters.assignedTo, filters.lob, filters.followUpDate]);

  useEffect(() => {
    if (phone.length < 6) {
      setSearchResults({ profiles: [], policyMatches: [] });
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
  }, [phone]);

  function updateField(key, value) {
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
    setSearchResults({ profiles: [], policyMatches: [] });
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

  function submitProfile() {
    startTransition(async () => {
      setAlert(null);
      try {
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
        setSearchResults({ profiles: [], policyMatches: [] });
        setAlert({ type: "success", message: selectedExistingId ? "Customer profile details updated." : "Customer profile saved. Click View More to fill full details on the right." });
        await loadProfiles();
      } catch (error) {
        setAlert({ type: "error", message: error.message || "Customer profile could not be saved." });
      }
    });
  }

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
      router.push(payload.redirectUrl || `/bulk-upload?profileId=${selectedExistingId}`);
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

      <section className="customer-profile-card agent-journey-card">
        <div className="customer-profile-section-head">
          <div>
            <h2>Agent Journey</h2>
            <p>Recommended flow for turning an existing policy customer into a cross-sell profiling lead.</p>
          </div>
        </div>
        <div className="agent-journey-steps">
          {AGENT_JOURNEY_STEPS.map(([number, title, detail]) => (
            <div className="agent-journey-step" key={number}>
              <strong>{number}</strong>
              <div>
                <span>{title}</span>
                <p>{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="customer-profile-card">
        <div className="customer-profile-section-head">
          <div>
            <h2>Customer Profile Check</h2>
            <p>Enter phone number to check whether another agent is already handling this profiling lead.</p>
          </div>
          <Search size={20} />
        </div>
        <div className="customer-profile-grid two">
          <Field label="Phone Number" value={form.phone} onChange={(value) => updateField("phone", value)} />
          <SelectField label="Customer Type" value={form.customerType} options={CUSTOMER_TYPES} onChange={(value) => updateField("customerType", value)} />
        </div>

        {hasMatches ? (
          <div className="duplicate-warning">
            <AlertTriangle size={18} />
            <div>
              <strong>This phone number has related records.</strong>
              <p>This number already exists in Customer Profiling.</p>
              {assignedNames[0] ? <p>Existing follow-up is being handled by {assignedNames[0]}.</p> : null}
            </div>
          </div>
        ) : phone.length >= 6 ? (
          <div className="duplicate-clear">
            <CheckCircle size={18} /> No matching Customer Profile found. You can add this client.
          </div>
        ) : null}

        {hasMatches ? (
          <ExistingCustomerTable
            profiles={searchResults.profiles}
            onSelectProfile={openProfile}
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
                    <h2>Conversion</h2>
                    <p>Use only after the client buys and policy is ready to upload.</p>
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
                <div className="customer-profile-actions inline-actions">
                  <button type="button" onClick={submitProfile} disabled={isPending}>Save Policy Interest</button>
                  <select value={convertType} onChange={(event) => setConvertType(event.target.value)}>
                    <option value="">Select converted policy type</option>
                    {form.selectedLOBs.map((lob) => (
                      <option key={lob} value={lob}>{lob}</option>
                    ))}
                  </select>
                  <button className="secondary-action" type="button" onClick={convertProfile} disabled={isPending}>
                    Converted - Upload Policy
                  </button>
                </div>
              </section>
            </>
          )}
        </aside>
      </div>
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

function ExistingCustomerTable({ profiles, onSelectProfile }) {
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
        </tbody>
      </table>
    </div>
  );
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
