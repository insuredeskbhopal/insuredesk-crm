"use client";

/* global AbortController, clearTimeout */
import { useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") || "";
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedExistingId, setSelectedExistingId] = useState("");
  const [convertType, setConvertType] = useState("");
  const [searchResults, setSearchResults] = useState(EMPTY_SEARCH_RESULTS);
  const [profiles, setProfiles] = useState([]);
  const [counters, setCounters] = useState(EMPTY_COUNTERS);
  const [filterOptions, setFilterOptions] = useState({ assignedTo: [], lobs: [] });
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [filters, setFilters] = useState({
    q: urlQuery,
    status: "",
    assignedTo: "",
    lob: "",
    followUpDate: ""
  });
  const [alert, setAlert] = useState(null);
  const [isPending, startTransition] = useTransition();
  const [conversionModalData, setConversionModalData] = useState(null);
  const [remarkModalOpen, setRemarkModalOpen] = useState(false);
  const [remarkProfile, setRemarkProfile] = useState(null);
  const [remarkForm, setRemarkForm] = useState({
    status: "New Lead",
    outcome: "Call Back Later",
    nextFollowUpDate: "",
    policyInterest: "",
    policyDetails: {},
    remark: ""
  });

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
    setFilters((current) => current.q === urlQuery ? current : { ...current, q: urlQuery });
  }, [urlQuery]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      loadProfiles(controller.signal);
    }, filters.q ? 250 : 0);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [filters.q, filters.status, filters.assignedTo, filters.lob, filters.followUpDate, page, limit]);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    setPage(1);
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

  function openRemarkModal(profile) {
    const policyInterest = profile.selectedLOBs?.[0] || "";
    setRemarkProfile(profile);
    setRemarkForm({
      status: profile.status || "New Lead",
      outcome: profile.followUpOutcome || "Call Back Later",
      nextFollowUpDate: profile.nextFollowUpDate ? new Date(profile.nextFollowUpDate).toISOString().slice(0, 10) : "",
      policyInterest,
      policyDetails: policyInterest ? (profile.lobDetails?.[policyInterest] || {}) : {},
      remark: ""
    });
    setRemarkModalOpen(true);
  }

  function updateRemarkPolicyInterest(value) {
    setRemarkForm((current) => ({
      ...current,
      policyInterest: value,
      policyDetails: value ? (remarkProfile?.lobDetails?.[value] || {}) : {}
    }));
  }

  function updateRemarkPolicyDetail(key, value) {
    setRemarkForm((current) => ({
      ...current,
      policyDetails: {
        ...(current.policyDetails || {}),
        [key]: value
      }
    }));
  }

  async function saveTableRemark({ convert = false } = {}) {
    if (!remarkProfile) return null;
    const text = remarkForm.remark.trim();
    if (!text) {
      setAlert({ type: "error", message: "Remark is required." });
      return null;
    }
    if (!remarkForm.policyInterest) {
      setAlert({ type: "error", message: "Select interested policy type." });
      return null;
    }

    const now = new Date().toISOString();
    const selectedLOBs = [...new Set([...(remarkProfile.selectedLOBs || []), remarkForm.policyInterest])];
    const entry = {
      id: `${Date.now()}`,
      remark: text,
      rawRemark: text,
      outcome: convert ? "Converted" : remarkForm.outcome,
      mode: "Customer Profiling",
      priority: "Normal",
      nextFollowUpDate: remarkForm.nextFollowUpDate,
      policyInterest: remarkForm.policyInterest,
      policyDetails: remarkForm.policyDetails || {},
      status: convert ? "Converted" : remarkForm.status,
      createdAt: now,
      createdBy: currentUser?.name || currentUser?.email || remarkProfile.assignedTo || "Agent"
    };
    const payload = {
      ...remarkProfile,
      selectedLOBs,
      status: convert ? "Converted" : remarkForm.status,
      followUpOutcome: convert ? "Converted" : remarkForm.outcome,
      followUpRemark: text,
      lastFollowUpDate: now,
      nextFollowUpDate: remarkForm.nextFollowUpDate || null,
      lobDetails: {
        ...(remarkProfile.lobDetails || {}),
        [remarkForm.policyInterest]: remarkForm.policyDetails || {},
        followUps: [entry, ...(Array.isArray(remarkProfile.lobDetails?.followUps) ? remarkProfile.lobDetails.followUps : [])]
      }
    };

    const response = await fetch(`/api/customer-profiles/${remarkProfile.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const updated = await response.json().catch(() => ({}));
    if (!response.ok) {
      setAlert({ type: "error", message: updated.error || "Customer profile remark could not be saved." });
      return null;
    }

    return updated;
  }

  function submitTableRemark() {
    startTransition(async () => {
      const updated = await saveTableRemark();
      if (!updated) return;
      setRemarkModalOpen(false);
      setRemarkProfile(null);
      setAlert({ type: "success", message: "Follow-up remark saved." });
      await loadProfiles();
    });
  }

  function convertFromRemarkModal() {
    startTransition(async () => {
      const updated = await saveTableRemark({ convert: true });
      if (!updated) return;
      const response = await fetch(`/api/customer-profiles/${remarkProfile.id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ insuranceType: remarkForm.policyInterest })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setAlert({ type: "error", message: payload.error || "Customer profile could not be converted." });
        return;
      }
      setRemarkModalOpen(false);
      setConversionModalData({
        step: "options",
        profile: updated,
        conversionType: remarkForm.policyInterest,
        handoffRemark: remarkForm.remark.trim(),
        redirectUrl: payload.redirectUrl
      });
      await loadProfiles();
    });
  }

  function openProfile(profile) {
    setSelectedExistingId(profile.id);
    setConvertType("");
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

  function mapPolicyRecordToLobDetails(record, lob) {
    if (!lob) return {};
    const details = {};
    
    let expiryStr = "";
    if (record.expiryDate) {
      try {
        expiryStr = new Date(record.expiryDate).toISOString().slice(0, 10);
      } catch {
        expiryStr = record.expiryDate;
      }
    }

    let startStr = "";
    if (record.startDate) {
      try {
        startStr = new Date(record.startDate).toISOString().slice(0, 10);
      } catch {
        startStr = record.startDate;
      }
    }

    if (lob === "Motor Insurance") {
      details.vehicleType = record.vehicleType || record.makeModel || "";
      details.vehicleNumber = record.vehicleNumber || record.registrationNumber || "";
      details.existingPolicyAvailable = "Yes";
      details.renewalDate = expiryStr;
    } else if (lob === "Warehouse Insurance") {
      details.warehouseLocation = record.riskLocation || "";
      details.stockValue = record.sumInsured || "";
      details.existingInsuranceAvailable = "Yes";
      details.renewalDate = expiryStr;
    } else if (lob === "Life Insurance") {
      details.existingLifeCover = "Yes";
    } else if (lob === "Health Insurance") {
      details.existingHealthCover = "Yes";
      details.sumInsuredNeed = record.sumInsured || "";
      details.renewalDate = expiryStr;
    } else if (lob === "Fire Insurance") {
      details.riskLocation = record.riskLocation || "";
      details.propertyValue = record.sumInsured || "";
      details.occupancy = record.occupancy || "";
      details.renewalDate = expiryStr;
    } else if (lob === "Marine Insurance") {
      details.cargoType = record.description || "";
      details.annualTransitValue = record.sumInsured || "";
      details.existingInsuranceAvailable = "Yes";
    } else if (lob === "Travel Insurance") {
      details.destination = record.validIn || "";
      details.travelDate = startStr;
      details.tripDuration = record.duration || "";
    } else if (lob === "Cyber Insurance") {
      details.existingInsuranceAvailable = "Yes";
    } else if (lob === "Shop / Office Insurance") {
      details.shopLocation = record.riskLocation || "";
      details.assetValue = record.sumInsured || "";
      details.renewalDate = expiryStr;
    } else if (lob === "Business Insurance") {
      details.businessCategory = record.policyType || "";
      details.keyRisk = record.description || "";
    } else {
      details.insuranceNeed = record.policyType || "";
      details.estimatedValue = record.sumInsured || "";
      details.notes = record.remark || "";
    }
    return details;
  }

  function usePolicyLead(record) {
    const inferredLob = inferLobFromPolicyType(record.policyType);
    setSelectedExistingId("");
    setConvertType("");

    const lobDetails = {};
    if (inferredLob) {
      lobDetails[inferredLob] = mapPolicyRecordToLobDetails(record, inferredLob);
    }

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
      lobDetails: lobDetails,
      remarks: [record.policyNumber ? `Source policy ${record.policyNumber}` : "", record.policyType, record.insuranceCompany].filter(Boolean).join(" / ")
    });
    setAlert({ type: "success", message: "Policy customer loaded with saved details. Save Profile to add it to Customer Profiling." });
  }

  function newProfile() {
    setSelectedExistingId("");
    setConvertType("");
    setForm({
      ...EMPTY_FORM,
      assignedTo: currentUser?.name || currentUser?.email || ""
    });
    setSearchResults(EMPTY_SEARCH_RESULTS);
  }

  async function loadProfiles(signal) {
    const params = new window.URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    params.set("page", page);
    params.set("limit", limit);
    try {
      const response = await fetch(`/api/customer-profiles?${params.toString()}`, { signal });
      if (!response.ok) return;
      const payload = await response.json();
      setProfiles(payload.profiles || []);
      setCounters(payload.counters || EMPTY_COUNTERS);
      setFilterOptions(payload.filterOptions || { assignedTo: [], lobs: [] });
      setTotalCount(payload.total || 0);
      setTotalPages(payload.totalPages || 1);
    } catch (error) {
      if (error.name !== "AbortError") {
        setAlert({ type: "error", message: "Customer profiles could not be loaded." });
      }
    }
  }

  async function loadCurrentUser() {
    if (currentUser) return;
    const response = await fetch("/api/auth/me");
    if (!response.ok) return;
    const payload = await response.json().catch(() => ({}));
    if (payload.success) {
      setCurrentUser(payload.user);
      const creatorLabel = payload.user?.name || payload.user?.email || "";
      if (creatorLabel) {
        setForm((current) => (current.assignedTo || selectedExistingId) ? current : { ...current, assignedTo: creatorLabel });
      }
    }
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

        let updatedForm = { ...form };

        if (selectedExistingId) {
          // Format LOB details into a text remark
          const metadataLines = [];
          form.selectedLOBs.forEach((lob) => {
            if (LOB_FIELDS[lob]) {
              const details = [];
              LOB_FIELDS[lob].forEach(([key, label, type]) => {
                const val = form.lobDetails?.[lob]?.[key];
                if (val !== undefined && val !== null && String(val).trim() !== "") {
                  let displayVal = val;
                  if (type === "date") {
                    displayVal = formatDate(val);
                  }
                  details.push(`${label}: ${displayVal}`);
                }
              });
              if (details.length > 0) {
                metadataLines.push(`${lob} Details: ${details.join(" | ")}`);
              }
            }
          });

          // Use the entered followUpRemark or a default if none is provided
          const userRemark = (form.followUpRemark || "").trim();
          
          if (metadataLines.length > 0 || userRemark) {
            let finalRemark = "";
            if (metadataLines.length > 0) {
              finalRemark += metadataLines.join("\n");
            }
            if (userRemark) {
              // If the user remark already contains the metadata or starts with it, don't double append
              if (!userRemark.includes(metadataLines[0] || "___NON_EXISTENT___")) {
                finalRemark += (finalRemark ? "\n\n" : "") + `Remark: ${userRemark}`;
              } else {
                finalRemark = userRemark;
              }
            }

            const lastEntry = form.lobDetails?.followUps?.[form.lobDetails.followUps.length - 1];
            const isDuplicate = lastEntry && lastEntry.remark === finalRemark;

            if (!isDuplicate) {
              const entry = {
                id: `${Date.now()}`,
                remark: finalRemark,
                rawRemark: userRemark || finalRemark,
                outcome: form.followUpOutcome || "Call Back Later",
                mode: "Other",
                priority: "Normal",
                nextFollowUpDate: form.nextFollowUpDate,
                policyInterest: form.selectedLOBs?.[0] || "",
                status: form.status || "Follow-up Required",
                createdAt: new Date().toISOString(),
                createdBy: form.assignedTo || "Agent"
              };

              updatedForm = {
                ...form,
                followUpRemark: finalRemark,
                lobDetails: {
                  ...(form.lobDetails || {}),
                  followUps: [...(Array.isArray(form.lobDetails?.followUps) ? form.lobDetails.followUps : []), entry]
                }
              };
            }
          }
        }

        const response = await fetch(selectedExistingId ? `/api/customer-profiles/${selectedExistingId}` : "/api/customer-profiles", {
          method: selectedExistingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedForm)
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

  const generateMessageText = (profile, conversionType, handoffRemark) => {
    if (!profile) return "";
    let lines = [];
    
    // 1. Which policy the client asked for
    lines.push(`*We need this policy*: ${conversionType || "General Insurance"}`);
    lines.push(``);
    
    // 2. Handoff Instruction
    if (handoffRemark) {
      lines.push(`*Handoff Instruction (for Agent/Team)*: ${handoffRemark}`);
      lines.push(``);
    }
    
    // 3. Client details
    lines.push(`*CLIENT DETAILS*`);
    lines.push(`- *Name*: ${profile.name || "-"}`);
    lines.push(`- *Phone*: ${profile.phone || "-"}`);
    if (profile.email) lines.push(`- *Email*: ${profile.email}`);
    if (profile.city || profile.state) lines.push(`- *Location*: ${[profile.city, profile.state].filter(Boolean).join(", ")}`);
    if (profile.address) lines.push(`- *Address*: ${profile.address}`);
    
    // 4. LOB Specific Details
    if (conversionType && LOB_FIELDS[conversionType]) {
      lines.push(``);
      lines.push(`*Policy Interest Details*:`);
      LOB_FIELDS[conversionType].forEach(([key, label, type]) => {
        const val = profile.lobDetails?.[conversionType]?.[key];
        let displayVal = val || "-";
        if (type === "date" && val) {
          displayVal = formatDate(val);
        }
        lines.push(`- ${label}: ${displayVal}`);
      });
    }

    // 5. Last two conversation follow-ups
    const followUps = profile.lobDetails?.followUps || [];
    if (followUps.length > 0) {
      lines.push(``);
      lines.push(`*Last 2 Conversations*:`);
      const lastTwo = followUps.slice(-2);
      lastTwo.forEach((entry, idx) => {
        const dateStr = entry.createdAt ? formatDateTime(entry.createdAt) : "-";
        const author = entry.createdBy || "Agent";
        const cleanRemark = entry.rawRemark || entry.remark || "-";
        lines.push(`[${idx + 1}] *Date*: ${dateStr} | *By*: ${author}`);
        lines.push(`*Remark*: ${cleanRemark}`);
      });
    } else if (profile.followUpRemark) {
      lines.push(``);
      lines.push(`*Last Conversation*:`);
      lines.push(`*Remark*: ${profile.followUpRemark}`);
    }

    if (profile.remarks) {
      lines.push(``);
      lines.push(`*General Remarks*: ${profile.remarks}`);
    }

    return lines.join("\n");
  };

  const handlePrintProfile = (profile, conversionType, handoffRemark) => {
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

    let followUpsHtml = "";
    const followUps = profile.lobDetails?.followUps || [];
    if (followUps.length > 0) {
      const lastTwo = followUps.slice(-2);
      followUpsHtml = `
        <div class="section">
          <h3>Last 2 Conversations</h3>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${lastTwo.map((entry, idx) => {
              const dateStr = entry.createdAt ? formatDateTime(entry.createdAt) : "-";
              const author = entry.createdBy || "Agent";
              const cleanRemark = entry.rawRemark || entry.remark || "-";
              return `
                <div class="field" style="background: #ffffff; border-color: #e2e8f0;">
                  <span class="label" style="font-size: 8px; font-weight: 700; color: #64748b; margin-bottom: 4px;">Conversation #${idx + 1} - ${dateStr} by ${author}</span>
                  <span class="value" style="font-size: 11px; font-weight: 500; color: #334155; display: block; white-space: pre-wrap;">${cleanRemark}</span>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      `;
    } else if (profile.followUpRemark) {
      followUpsHtml = `
        <div class="section">
          <h3>Last Conversation</h3>
          <div class="field" style="background: #ffffff; border-color: #e2e8f0;">
            <span class="value" style="font-size: 11px; font-weight: 500; color: #334155; display: block; white-space: pre-wrap;">${profile.followUpRemark}</span>
          </div>
        </div>
      `;
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
            .header-left h1 {
              margin: 0;
              font-size: 20px;
              font-weight: 800;
              color: #1e3a8a;
            }
            .header-left p {
              margin: 4px 0 0;
              color: #64748b;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 1px;
              font-weight: 700;
            }
            .print-logo {
              height: 48px;
              width: auto;
              object-fit: contain;
            }
            .section {
              margin-bottom: 20px;
              page-break-inside: avoid;
            }
            .section h3 {
              margin: 0 0 10px;
              font-size: 13px;
              font-weight: 700;
              color: #0f172a;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 6px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
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
              font-size: 11px;
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
            <div class="header-left">
              <h1>Lead Converted Successfully</h1>
              <p>We need this policy: ${conversionType}</p>
            </div>
            <img src="${window.location.origin}/brand/main-logo-wide.png" alt="Logo" class="print-logo" />
          </div>
          
          ${handoffRemark ? `
            <div class="section">
              <h3>Handoff Instruction / Team Remark</h3>
              <div class="field" style="background: #eff6ff; border-color: #bfdbfe;">
                <span class="value" style="font-weight: 600; color: #1e3a8a; display: block; white-space: pre-wrap;">${handoffRemark}</span>
              </div>
            </div>
          ` : ""}

          ${renderPrintSection("General Client Information", generalFields)}
          ${lobFields.length ? renderPrintSection(`${conversionType} Details`, lobFields) : ""}
          ${followUpsHtml}
          
          ${profile.remarks ? `
            <div class="section">
              <h3>Remarks</h3>
              <div class="field" style="background: #fffbeb; border-color: #fef3c7;">
                <span class="value" style="font-weight: 500; white-space: pre-wrap;">${profile.remarks}</span>
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

    setConversionModalData({
      profile: form,
      conversionType: conversionType,
      handoffRemark: "",
      step: "remark",
      error: ""
    });
  }

  async function submitConversion(remark) {
    if (!remark || !remark.trim()) {
      setConversionModalData(current => ({ ...current, error: "Handoff remark is required to convert the lead." }));
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch(`/api/customer-profiles/${selectedExistingId}/convert`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ insuranceType: conversionModalData.conversionType })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          setConversionModalData(current => ({ ...current, error: payload.error || "Conversion could not be started." }));
          return;
        }
        setConversionModalData(current => ({
          ...current,
          handoffRemark: remark.trim(),
          step: "options",
          error: ""
        }));
        setAlert({ type: "success", message: "Customer profile converted successfully!" });
        await loadProfiles();
      } catch (err) {
        setConversionModalData(current => ({ ...current, error: err.message || "An error occurred." }));
      }
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
        <section className="customer-profile-card customer-profile-list-panel">
          <div className="customer-profile-section-head">
            <div>
              <h2>Saved Customer Profiles</h2>
              <p>Review added clients, open profiles, or add follow-up remarks from the action column.</p>
            </div>
          </div>
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
                onEdit={(profile) => router.push(`/dashboard/manual-entry/customer-profiling/${profile.id}`)}
                onAddRemark={openRemarkModal}
              />

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="table-pagination" style={{ marginTop: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "14px", color: "var(--text-secondary, #64748b)" }}>Showing page {page} of {totalPages} ({totalCount} profiles found)</span>
                  <div className="table-page-list" style={{ display: "flex", gap: "6px" }}>
                    <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid var(--border, #cbd5e1)", cursor: page === 1 ? "not-allowed" : "pointer" }}>
                      Prev
                    </button>
                    {getPageNumbers(page, totalPages).map((pNum, index) => (
                      pNum === "..." ? (
                        <span key={`ellipsis-${index}`} style={{ padding: "0 8px", color: "var(--text-secondary, #64748b)" }}>...</span>
                      ) : (
                        <button
                          key={pNum}
                          type="button"
                          className={page === pNum ? "active" : ""}
                          onClick={() => setPage(pNum)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "6px",
                            border: "1px solid var(--border, #cbd5e1)",
                            background: page === pNum ? "var(--primary, #1e3a8a)" : "#ffffff",
                            color: page === pNum ? "#ffffff" : "var(--text-primary, #0f172a)",
                            cursor: "pointer",
                            fontWeight: page === pNum ? "bold" : "normal"
                          }}
                        >
                          {pNum}
                        </button>
                      )
                    ))}
                    <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid var(--border, #cbd5e1)", cursor: page === totalPages ? "not-allowed" : "pointer" }}>
                      Next
                    </button>
                  </div>
                </div>
              )}
          </>
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

      {typeof window !== "undefined" && remarkModalOpen && remarkProfile && createPortal(
        <div className="tb-modal-backdrop customer-profile-remark-backdrop" onClick={() => setRemarkModalOpen(false)}>
          <div className="customer-profile-remark-card" onClick={(event) => event.stopPropagation()}>
            <div className="customer-profile-remark-head">
              <h3>Add Follow-up Remark</h3>
              <button type="button" onClick={() => setRemarkModalOpen(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>

            <div className="customer-profile-remark-body">
              <div className="customer-profile-remark-grid">
                <label>
                  <span>Status</span>
                  <select value={remarkForm.status} onChange={(event) => setRemarkForm((current) => ({ ...current, status: event.target.value }))}>
                    {PROFILE_STATUS.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </label>
                <label>
                  <span>Outcome</span>
                  <select value={remarkForm.outcome} onChange={(event) => setRemarkForm((current) => ({ ...current, outcome: event.target.value }))}>
                    {FOLLOW_UP_OUTCOMES.filter(Boolean).map((outcome) => <option key={outcome} value={outcome}>{outcome}</option>)}
                  </select>
                </label>
                <label>
                  <span>Next Follow-up Date</span>
                  <input type="date" value={remarkForm.nextFollowUpDate} onChange={(event) => setRemarkForm((current) => ({ ...current, nextFollowUpDate: event.target.value }))} />
                </label>
                <label>
                  <span>Interested Policy Type</span>
                  <select value={remarkForm.policyInterest} onChange={(event) => updateRemarkPolicyInterest(event.target.value)}>
                    <option value="">Select policy type</option>
                    {LOB_OPTIONS.map((lob) => <option key={lob} value={lob}>{lob}</option>)}
                  </select>
                </label>
              </div>

              {remarkForm.policyInterest ? (
                <div className="customer-profile-remark-policy-grid">
                  {(LOB_FIELDS[remarkForm.policyInterest] || LOB_FIELDS.Other).map(([key, label, type]) => (
                    <label key={key}>
                      <span>{label}</span>
                      <input
                        type={type || "text"}
                        value={remarkForm.policyDetails?.[key] || ""}
                        onChange={(event) => updateRemarkPolicyDetail(key, event.target.value)}
                      />
                    </label>
                  ))}
                </div>
              ) : null}

              <label className="customer-profile-remark-textarea">
                <span>Remark Text *</span>
                <textarea value={remarkForm.remark} onChange={(event) => setRemarkForm((current) => ({ ...current, remark: event.target.value }))} placeholder="Enter details of conversation..." />
              </label>
            </div>

            <div className="customer-profile-remark-footer">
              <button type="button" onClick={() => setRemarkModalOpen(false)}>Cancel</button>
              <button type="button" onClick={convertFromRemarkModal} disabled={isPending}>Convert Lead</button>
              <button type="button" className="primary" onClick={submitTableRemark} disabled={isPending}>{isPending ? "Saving..." : "Save Remark"}</button>
            </div>
          </div>
        </div>,
        document.body
      )}

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
            {conversionModalData.step === "remark" ? (
              <>
                {/* Step 1: Collect Handoff Remark */}
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
                    <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px", color: "var(--primary)" }}>Lead Conversion</span>
                    <h2 style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: "850", color: "#0f172a" }}>
                      Enter Handoff Instructions
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

                <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                  <p style={{ margin: 0, fontSize: "14px", color: "#475569", lineHeight: "1.5" }}>
                    Please enter the handoff remark or instructions for the relevant team who will be handling this converted lead.
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <span style={{ fontSize: "12px", fontWeight: "700", color: "#64748b" }}>Handoff Remark / Instructions (Required)</span>
                    <textarea
                      placeholder="Type the remark for the team here..."
                      value={conversionModalData.handoffRemark || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setConversionModalData(current => ({ ...current, handoffRemark: val, error: "" }));
                      }}
                      style={{
                        width: "100%",
                        height: "120px",
                        padding: "12px",
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                        background: "#ffffff",
                        fontSize: "14px",
                        color: "#334155",
                        resize: "none"
                      }}
                    />
                  </div>

                  {conversionModalData.error ? (
                    <div style={{ color: "#ef4444", fontSize: "13px", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}>
                      <AlertTriangle size={16} />
                      <span>{conversionModalData.error}</span>
                    </div>
                  ) : null}
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    padding: "16px 24px",
                    borderTop: "1px solid #f1f5f9",
                    gap: "12px"
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setConversionModalData(null)}
                    style={{
                      padding: "10px 20px",
                      borderRadius: "12px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#ffffff",
                      color: "#475569",
                      fontWeight: "600",
                      cursor: "pointer"
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => submitConversion(conversionModalData.handoffRemark)}
                    disabled={isPending}
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
                    {isPending ? "Converting..." : "Convert Lead"}
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Step 2: Converted options */}
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
                      value={generateMessageText(conversionModalData.profile, conversionModalData.conversionType, conversionModalData.handoffRemark)}
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
                        const text = generateMessageText(conversionModalData.profile, conversionModalData.conversionType, conversionModalData.handoffRemark);
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
                        const text = generateMessageText(conversionModalData.profile, conversionModalData.conversionType, conversionModalData.handoffRemark);
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
                    onClick={() => handlePrintProfile(conversionModalData.profile, conversionModalData.conversionType, conversionModalData.handoffRemark)}
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
              </>
            )}
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

function ProfileListingTable({ profiles, onEdit, onAddRemark }) {
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
                  <button type="button" onClick={() => onAddRemark(profile)}>Add Remark</button>
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

function getPageNumbers(currentPage, totalPages) {
  const pages = [];
  const maxVisible = 5;
  if (totalPages <= maxVisible) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("...");
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }
  return pages;
}
