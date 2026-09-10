const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const EMPLOYEE_BLOG_POSTS = [
  {
    slug: "section-45-insurance-act-claim-rejection-guide",
    title: "Section 45 Insurance Rule: Can the Company Reject Your Life Insurance After 3 Years?",
    excerpt: "Good news for policyholders: By Indian law, an insurance company cannot reject your life insurance claim after 3 years on any ground. Here is how this simple rule protects your family.",
    category: "Business Risk",
    readTime: "6 min read",
    date: "September 10, 2026",
    author: { name: "Anand Soni", role: "Founder Director & Risk Governance Lead" },
    coverImage: "/brand/blog-section-45-claim.jpg",
    published: true,
    sections: [
      {
        type: "paragraph",
        text: "When you buy <a href='/services/life-insurance' class='text-blue-700 font-semibold hover:underline'>life insurance</a>, you want peace of mind that your family will get the money if something happens to you. In the past, companies used to search old hospital files and reject claims after many years. But under Section 45 of the Insurance Act (updated in 2015), Indian law gives you 100% protection after 3 years. Here is how it works in simple words."
      },
      {
        type: "heading",
        text: "1. The 3-Year Golden Rule"
      },
      {
        type: "paragraph",
        text: "Once your life insurance policy completes 3 continuous years from the start date, the insurance company cannot reject a death claim for any reason. They cannot say you forgot to mention an illness or made a mistake on your proposal form. The law says the company had 3 full years to check everything. Once 3 years pass, they must pay the claim to your nominee. Our <a href='/services/claims-assistance' class='text-blue-700 font-semibold hover:underline'>claims assistance</a> team ensures your nominee never faces unlawful delays."
      },
      {
        type: "heading",
        text: "2. What Happens in the First 3 Years?"
      },
      {
        type: "paragraph",
        text: "During the first 3 years, the company can investigate your medical history. If someone lied about a major disease like heart illness or cancer when buying the policy, the claim can be rejected. That is why it is always best to tell the truth about smoking, drinking, diabetes, or blood pressure when filling the form."
      },
      {
        type: "heading",
        text: "3. Be Careful If Your Policy Stops (Lapses)"
      },
      {
        type: "paragraph",
        text: "If you forget to pay your premium on time and restart (revive) the policy later, the 3-year timer starts fresh from the day you restarted it. Always pay your premiums on time to keep your 3-year safety intact."
      },
      {
        type: "heading",
        text: "4. Easy Steps to Protect Your Family's Claim"
      },
      {
        type: "list",
        items: [
          "Always tell the truth about your health and medical habits when buying the policy.",
          "Pay your premiums on time so your policy never stops or lapses.",
          "Give your policy number and papers to your family or nominee so they know who to call.",
          "If any company tries to reject a 4-year or 5-year-old policy, reply immediately that Section 45 strictly protects your claim."
        ]
      }
    ]
  },
  {
    slug: "insurance-ombudsman-bima-bharosa-claim-rejection-guide",
    title: "Insurance Claim Rejected? How to Complain and Win Your Money Back in India",
    excerpt: "Did your insurance company reject your claim or pay less money? You don't need a lawyer or a court case. Here is how to use Bima Bharosa and the Insurance Ombudsman for free.",
    category: "Claims",
    readTime: "7 min read",
    date: "September 09, 2026",
    author: { name: "Abhishek Verma", role: "Head of Digital Advisory & Operations" },
    coverImage: "/brand/blog-ombudsman-grievance.jpg",
    published: true,
    sections: [
      {
        type: "paragraph",
        text: "Getting a claim rejection letter from your insurance company hurts. Our <a href='/services/claims-assistance' class='text-blue-700 font-semibold hover:underline'>claims assistance experts</a> help policyholders dispute unfair rejections. Many people give up because they think hiring a lawyer and going to court will cost too much time and money. The good news is, the Government of India created a fast, 100% free way to fight unfair rejections called the Insurance Ombudsman."
      },
      {
        type: "heading",
        text: "1. Step 1: Write to the Company's Grievance Officer (GRO)"
      },
      {
        type: "paragraph",
        text: "Every insurance company in India must have a Grievance Officer. Write a simple email or letter explaining why the rejection is wrong. Attach your bills, policy schedule, and an independent <a href='/services/risk-advisory' class='text-blue-700 font-semibold hover:underline'>risk advisory report</a>. By law, the company must reply within 14 days."
      },
      {
        type: "heading",
        text: "2. Step 2: Register on IRDAI Bima Bharosa Portal"
      },
      {
        type: "paragraph",
        text: "If the company does not reply within 14 days or says no again, open the government website 'Bima Bharosa' (bimabharosa.irdai.gov.in). Lodge your complaint online. The government monitors this portal directly, so companies take it very seriously."
      },
      {
        type: "heading",
        text: "3. Step 3: Go to the Insurance Ombudsman (Claims up to ₹50 Lakhs)"
      },
      {
        type: "paragraph",
        text: "If you are still not happy, complain to the Insurance Ombudsman in your city. It is totally free. No lawyers are allowed. You just present your papers, and the Ombudsman listens to both sides. If the Ombudsman rules in your favour, the insurance company MUST pay you the money within 30 days."
      },
      {
        type: "heading",
        text: "4. Checklist Before You Complain"
      },
      {
        type: "list",
        items: [
          "Keep your rejection letter and claim number handy.",
          "File your complaint within 1 year from the date the company rejected your claim.",
          "Keep all original hospital or repair bills safely.",
          "Do not go to consumer court first; use the Ombudsman first because it is faster and completely free."
        ]
      }
    ]
  },
  {
    slug: "health-insurance-room-rent-capping-proportionate-deduction",
    title: "Room Rent Limit in Health Insurance: Why Hospital Upgrades Cut Your Claim by Half",
    excerpt: "Taking a bigger hospital room can secretly cut 40% to 60% of your surgery and doctor bill. Here is how room rent limits work and how to protect your money.",
    category: "Personal Insurance",
    readTime: "6 min read",
    date: "September 08, 2026",
    author: { name: "Shweta Hariyale", role: "Claims Operations Lead & Manager" },
    coverImage: "/brand/blog-health-room-rent.jpg",
    published: true,
    sections: [
      {
        type: "paragraph",
        text: "When a family member is in the hospital, you want them to be comfortable. So you might choose a private room that costs ₹8,000 a day instead of ₹5,000, thinking you will just pay the ₹3,000 difference from your pocket. But at discharge time, you get a shock: the insurance company cuts your entire bill by 40% to 50%! Why does this happen?"
      },
      {
        type: "heading",
        text: "1. How Room Rent Limits Work"
      },
      {
        type: "paragraph",
        text: "Most older <a href='/services/health-insurance' class='text-blue-700 font-semibold hover:underline'>health insurance policies</a> have a 1% room rent cap. If your policy is ₹5 Lakhs, your room limit is ₹5,000 per day. If you choose a room costing ₹10,000 per day, you took a room that is double your limit."
      },
      {
        type: "heading",
        text: "2. The Big Trap (Proportionate Cut)"
      },
      {
        type: "paragraph",
        text: "Private hospitals charge higher fees for doctors, surgeons, and operation theatres when you stay in a deluxe room. Because of this, the insurance company applies the same cut to your doctor and surgery fees! If you picked a room that was 50% more expensive, they will pay only 50% of your doctor and surgery fees."
      },
      {
        type: "heading",
        text: "3. What Charges Cannot Be Cut?"
      },
      {
        type: "paragraph",
        text: "In 2024, the insurance regulator (IRDAI) made a strict rule: companies cannot cut the price of medicines, injections, MRI/CT scans, or implants (like pacemakers or stents) just because you took a bigger room."
      },
      {
        type: "heading",
        text: "4. How to Avoid This Penalty"
      },
      {
        type: "list",
        items: [
          "When renewing, ask to remove the room rent limit or choose 'Single Private Room' cover.",
          "At hospital admission, ask the desk for a room that fits your policy limit exactly, or consult our <a href='/services/claims-assistance' class='text-blue-700 font-semibold hover:underline'>cashless claims desk</a>.",
          "Check your final hospital bill to make sure medicines and tests were not reduced.",
          "Take a Super Top-up policy with no room rent limit to pay for big hospital bills."
        ]
      }
    ]
  },
  {
    slug: "commercial-vehicle-insurance-claim-rejection-rules-fleet",
    title: "Truck & Fleet Insurance: Top 5 Reasons Claims Get Rejected in India",
    excerpt: "Commercial vehicles and freight trucks face heavy claim rejections. Learn how overloading, expired route permits, and driver license issues cause claims to fail, and how to stay safe.",
    category: "Business Risk",
    readTime: "7 min read",
    date: "September 07, 2026",
    author: { name: "Indu Mandrai", role: "Motor Fleet & Commercial Insurance Manager" },
    coverImage: "/brand/blog-commercial-vehicle.jpg",
    published: true,
    sections: [
      {
        type: "paragraph",
        text: "Managing freight fleets requires comprehensive <a href='/services/commercial-insurance' class='text-blue-700 font-semibold hover:underline'>commercial vehicle insurance</a> tailored for Indian highways. When an accident happens on the highway, you expect the insurance company to pay for the vehicle repairs. But commercial vehicle claims get rejected very often. Here are the top reasons why and how you can prevent it."
      },
      {
        type: "heading",
        text: "1. Reason 1: Overloading the Truck"
      },
      {
        type: "paragraph",
        text: "Under standard <a href='/services/motor-insurance' class='text-blue-700 font-semibold hover:underline'>commercial motor insurance</a>, every vehicle has a maximum weight limit (GVW) written in its RC book. If your truck meets with an accident and the toll weighbridge slip or e-way bill shows you were carrying even 1 ton extra weight, the insurer can reject your claim completely for overloading."
      },
      {
        type: "heading",
        text: "2. Reason 2: Expired Route Permit or Fitness Certificate"
      },
      {
        type: "paragraph",
        text: "If your vehicle was driving outside its permitted state without a National Permit, or if the annual Fitness Certificate (FC) was expired even by 1 day, the law treats the truck as unauthorized. The insurance company will not pay for the damage."
      },
      {
        type: "heading",
        text: "3. Reason 3: Wrong Driver License"
      },
      {
        type: "paragraph",
        text: "Commercial trucks need a driver with a 'Transport' vehicle license. For fuel tankers, gas trucks, and chemical carriers, the driver must also have a special 'Hazardous Goods' certificate. If the driver does not have this paper, the claim will be rejected."
      },
      {
        type: "heading",
        text: "4. Simple Rules for Fleet Owners"
      },
      {
        type: "list",
        items: [
          "Set phone reminders 30 days before truck fitness, permits, and road tax expire.",
          "Always check weight slips at factory gates so trucks are never overloaded.",
          "Take clear photos of the truck and road right after an accident before moving goods.",
          "Inform the local police (GD or FIR) within 24 hours if anyone is hurt."
        ]
      }
    ]
  },
  {
    slug: "zero-depreciation-vs-comprehensive-car-insurance-guide",
    title: "Zero Dep vs Normal Car Insurance: Which One Should You Buy?",
    excerpt: "Wondering if Zero Depreciation is worth the extra money? See how much money you save on plastic, fiber, and bumper repairs after a car accident.",
    category: "Personal Insurance",
    readTime: "6 min read",
    date: "September 06, 2026",
    author: { name: "Indu Mandrai", role: "Motor Claims & Fleet Insurance Manager" },
    coverImage: "/brand/blog-zero-dep-guide.jpg",
    published: true,
    sections: [
      {
        type: "paragraph",
        text: "Every time you review your <a href='/services/motor-insurance' class='text-blue-700 font-semibold hover:underline'>car insurance policy</a>, the agent asks: 'Do you want Zero Dep or normal comprehensive insurance?' Zero Dep costs a little more, but it can save you tens of thousands of rupees after an accident. Let's see why."
      },
      {
        type: "heading",
        text: "1. What Happens in Normal Insurance?"
      },
      {
        type: "paragraph",
        text: "In a normal car policy, the insurance company cuts money for 'depreciation' (wear and tear). For plastic, rubber, tyres, and bumpers, they cut 50%! For fiberglass, they cut 30%. Since modern cars have plastic bumpers and fancy lights, you end up paying half the repair bill yourself."
      },
      {
        type: "heading",
        text: "2. What is Zero Dep (Bumper to Bumper)?"
      },
      {
        type: "paragraph",
        text: "Zero Dep means the company pays 100% of the replacement cost for all plastic, rubber, fiber, metal, and glass parts. You only pay a fixed standard fee of ₹1,000 or ₹2,000, and the rest is paid by the insurer. For faster approvals, our <a href='/services/claims-assistance' class='text-blue-700 font-semibold hover:underline'>motor claims team</a> assists with cashless surveyor inspections."
      },
      {
        type: "heading",
        text: "3. Real Example of Savings"
      },
      {
        type: "paragraph",
        text: "A small bump cracks your car bumper and headlight, costing ₹40,000 to fix. With normal insurance, you pay about ₹18,000 from your own pocket. With Zero Dep, you pay only around ₹1,500!"
      },
      {
        type: "heading",
        text: "4. Who Should Buy Zero Dep?"
      },
      {
        type: "list",
        items: [
          "Any car that is less than 5 years old should 100% have Zero Dep.",
          "New drivers and people who drive in heavy city traffic.",
          "Owners of expensive cars where headlight and bumper parts cost a lot.",
          "Also add 'Engine Protection' to stay safe during rainy season waterlogging."
        ]
      }
    ]
  },
  {
    slug: "how-to-transfer-ncb-no-claim-bonus-to-new-car",
    title: "How to Transfer 50% No Claim Bonus (NCB) to Your New Car: Step-by-Step",
    excerpt: "Your 50% NCB discount belongs to you, not your old car! Learn how to transfer this discount to a new car and save up to ₹40,000 on insurance.",
    category: "Renewals",
    readTime: "5 min read",
    date: "September 05, 2026",
    author: { name: "Payal Sahu", role: "Policy Renewals & Retention Manager" },
    coverImage: "/brand/blog-ncb-transfer.jpg",
    published: true,
    sections: [
      {
        type: "paragraph",
        text: "During annual <a href='/services/policy-renewals' class='text-blue-700 font-semibold hover:underline'>policy renewals</a>, safe drivers accumulate up to 50% No Claim Bonus discounts. you earn a 50% No Claim Bonus (NCB) discount. Many people think that when they sell their old car, they lose this discount. That is completely false! The discount belongs to you as a driver, not to the car."
      },
      {
        type: "heading",
        text: "1. The Big Secret: You Can Move Your Discount"
      },
      {
        type: "paragraph",
        text: "When you sell your old car, the buyer gets the insurance, but NOT your bonus discount. You can take an official NCB certificate and use that 50% discount to lower the premium on your new <a href='/services/motor-insurance' class='text-blue-700 font-semibold hover:underline'>motor insurance policy</a>!"
      },
      {
        type: "heading",
        text: "2. How to Get Your NCB Certificate"
      },
      {
        type: "paragraph",
        text: "Step 1: Sell your old car and get the sale receipt and transfer form (Form 29/30). Step 2: Give these papers to your old insurance company and ask for an 'NCB Retention Certificate'. Step 3: The company gives you an official certificate valid for 3 years. Step 4: Show this certificate when buying insurance for your new car and get up to 50% off."
      },
      {
        type: "heading",
        text: "3. What If You Buy the New Car First?"
      },
      {
        type: "paragraph",
        text: "You can pay the full insurance premium upfront for your new car. Once your old car is sold, give the papers to the company, and they will refund the 50% discount money back into your bank account."
      },
      {
        type: "heading",
        text: "4. Important Rules to Remember"
      },
      {
        type: "list",
        items: [
          "Never let your policy stay expired for more than 90 days, or your NCB becomes zero.",
          "Even a small claim can reset your NCB to zero, unless you buy 'NCB Protect'.",
          "You can use this discount with any insurance company in India.",
          "Always check that the discount is written clearly on your new policy paper."
        ]
      }
    ]
  },
  {
    slug: "average-clause-fire-insurance-underinsurance-penalty",
    title: "The Underinsurance Trap: Why Fire Insurance Cuts Your Factory Claim Payout",
    excerpt: "Insuring your factory machinery or warehouse stock for less value to save premium can backfire badly. Understand the Average Clause and how to get your full claim.",
    category: "Business Risk",
    readTime: "7 min read",
    date: "September 04, 2026",
    author: { name: "Pragati Pandey", role: "Industrial Fire & Warehouse Risk Manager" },
    coverImage: "/brand/blog-fire-underinsurance.jpg",
    published: true,
    sections: [
      {
        type: "paragraph",
        text: "When structuring <a href='/services/fire-insurance' class='text-blue-700 font-semibold hover:underline'>industrial fire insurance</a>, some factory and godown owners declare lower values for their machines or buildings. For example, if machines are worth ₹10 Crores, they insure them for only ₹6 Crores. They think, 'A fire will never destroy everything, so ₹6 Crores is enough.' But when a fire breaks out, this trick causes a huge financial loss. Here is why."
      },
      {
        type: "heading",
        text: "1. What is the Average Clause?"
      },
      {
        type: "paragraph",
        text: "Fire insurance policies have a rule called the 'Average Clause'. It says: If you insured only 60% of the real value of your factory, the company will pay only 60% of any damage, big or small!"
      },
      {
        type: "heading",
        text: "2. Real Example of an ₹80 Lakh Loss"
      },
      {
        type: "paragraph",
        text: "Your factory machinery is really worth ₹10 Crores, but you insured it for ₹6 Crores (60%). A small fire damages some machines, costing ₹2 Crores to repair. You expect the company to pay the full ₹2 Crores because it is well within your ₹6 Crore limit. But the company calculates: 60% of ₹2 Crores = Only ₹1.2 Crores! You lose ₹80 Lakhs out of pocket! This is why comprehensive <a href='/services/commercial-insurance' class='text-blue-700 font-semibold hover:underline'>commercial property insurance</a> audits are vital."
      },
      {
        type: "heading",
        text: "3. What is Reinstatement Value Clause (RVC)?"
      },
      {
        type: "paragraph",
        text: "Always buy your factory and building policy under 'Reinstatement Value'. This means if a machine burns, the company pays the full cost of buying a new machine of the same type without cutting money for age or depreciation."
      },
      {
        type: "heading",
        text: "4. How to Keep Your Factory Safe"
      },
      {
        type: "list",
        items: [
          "Calculate the true replacement cost of all machines every year, including transport and fitting costs.",
          "Always choose Reinstatement Value (RVC) instead of old Market Value.",
          "Keep separate values for building, machines, raw material, and finished goods.",
          "Inform your insurance advisor whenever you buy new machines or expand your plant."
        ]
      }
    ]
  },
  {
    slug: "stock-declaration-policy-warehouse-inventory-guide",
    title: "Warehouse Stock Declaration Insurance: Pay Premium Only for What You Store",
    excerpt: "Do your warehouse stock levels go up and down every month? Learn how a Stock Declaration Policy protects your inventory and refunds your unused premium.",
    category: "Business Risk",
    readTime: "6 min read",
    date: "September 03, 2026",
    author: { name: "Roshni Sahu", role: "Godown Stock & Declaration Policy Specialist" },
    coverImage: "/brand/blog-warehouse-stock.jpg",
    published: true,
    sections: [
      {
        type: "paragraph",
        text: "For businesses utilizing <a href='/services/warehouse-insurance' class='text-blue-700 font-semibold hover:underline'>warehouse insurance</a> and godown storage facilities, your stock is never the same every month. During Diwali or harvest seasons, your godown is packed with ₹20 Crores of goods. During slow months, you might have only ₹5 Crores. Buying a fixed insurance policy means you either overpay premiums during slow months or stay underinsured during peak months. A declaration structure under <a href='/services/commercial-insurance' class='text-blue-700 font-semibold hover:underline'>commercial property insurance</a> fixes this problem completely."
      },
      {
        type: "heading",
        text: "1. How Does a Stock Declaration Policy Work?"
      },
      {
        type: "paragraph",
        text: "You choose the highest stock value you expect during the year (for example, ₹20 Crores). At the end of every month, you tell the insurance company the actual average stock you had in your godown. At the end of the year, the company totals all 12 months and refunds up to 50% of your premium if your stock was lower!"
      },
      {
        type: "heading",
        text: "2. The Big Trap: Don't Miss the Monthly Deadline"
      },
      {
        type: "paragraph",
        text: "You must send your monthly stock declaration by the last day of the next month. If a fire happens and you forgot to send the stock numbers for the last two months, the company can reject your claim or pay only on the old, lower number."
      },
      {
        type: "heading",
        text: "3. How Should You Value Your Stock?"
      },
      {
        type: "paragraph",
        text: "Always declare stock at 'Landed Cost' (purchase price + transport + GST/taxes). Never declare the expected selling price or profit margin, because surveyors will check your actual purchase bills and Tally records."
      },
      {
        type: "heading",
        text: "4. Best Tips for Warehouse Owners"
      },
      {
        type: "list",
        items: [
          "Put a reminder on your calendar to submit stock statements by the 20th of every month.",
          "Make sure your godown address is written exactly as it is in your property papers.",
          "Keep daily stock records backed up safely in the cloud or offsite.",
          "Keep fire extinguishers and clear walking paths between boxes to follow safety rules."
        ]
      }
    ]
  },
  {
    slug: "business-interruption-flop-insurance-consequential-loss",
    title: "Business Interruption Insurance: How to Cover Salaries & Lost Profits After Factory Damage",
    excerpt: "When a factory stops working after a fire, you still have to pay bank EMIs, rent, and staff salaries. Learn how Fire Loss of Profits (FLOP) insurance keeps your business alive.",
    category: "Business Risk",
    readTime: "7 min read",
    date: "September 02, 2026",
    author: { name: "Siya Thakur", role: "Commercial Property & Risk Consultant" },
    coverImage: "/brand/blog-business-interruption.jpg",
    published: true,
    sections: [
      {
        type: "paragraph",
        text: "While standard <a href='/services/fire-insurance' class='text-blue-700 font-semibold hover:underline'>factory fire insurance</a> pays for machine replacement, repairing the machines is only half the battle. Rebuilding walls and waiting for new machines from overseas can take 6 months to a year. During these months, your factory produces zero goods, meaning zero sales. But your expenses don't stop: bank loan EMIs, factory rent, electricity bills, and employee salaries still have to be paid every month. This is where proactive corporate <a href='/services/risk-advisory' class='text-blue-700 font-semibold hover:underline'>risk advisory consulting</a> prevents bankruptcy."
      },
      {
        type: "heading",
        text: "1. What is Business Interruption Insurance (FLOP)?"
      },
      {
        type: "paragraph",
        text: "While standard fire insurance pays to fix the broken machines and walls, a FLOP (Fire Loss of Profit) policy pays for your lost net profits and covers your fixed monthly running expenses while the factory is closed."
      },
      {
        type: "heading",
        text: "2. What Expenses Does It Cover?"
      },
      {
        type: "paragraph",
        text: "It covers: 1. Net profit that your business would have earned if there were no fire. 2. Fixed standing charges like employee salaries, bank interest, rent, and taxes. 3. Extra working costs: money spent to rent a temporary workspace or outsource work so you don't lose customers."
      },
      {
        type: "heading",
        text: "3. How Long Will It Pay? (Indemnity Period)"
      },
      {
        type: "paragraph",
        text: "You can choose how many months of protection you need—usually 6, 12, 18, or 24 months. If your machines are imported and take 12 months to arrive, pick an 18-month period so you don't run out of support."
      },
      {
        type: "heading",
        text: "4. Checklist for Business Owners"
      },
      {
        type: "list",
        items: [
          "Always buy Business Interruption (FLOP) together with your main Fire policy.",
          "Check your yearly profit and loss statement to include all fixed bank EMIs and salaries.",
          "Add cover for key suppliers, so if their factory burns down and you cannot get raw material, your losses are still covered.",
          "Keep your accounts and sales orders safely backed up online."
        ]
      }
    ]
  },
  {
    slug: "marine-cargo-insurance-vs-transporter-carrier-liability",
    title: "Goods Damaged in Transit: Who Pays? Marine Insurance vs Transporter Rules",
    excerpt: "Many business owners think the trucking company will pay if goods are damaged on the highway. Learn the real laws and why you need Marine Transit Insurance.",
    category: "Business Risk",
    readTime: "6 min read",
    date: "September 01, 2026",
    author: { name: "Siya Thakur", role: "Commercial Property & Marine Transit Consultant" },
    coverImage: "/brand/blog-marine-cargo.jpg",
    published: true,
    sections: [
      {
        type: "paragraph",
        text: "Securing <a href='/services/marine-insurance' class='text-blue-700 font-semibold hover:underline'>marine cargo transit insurance</a> is essential whenever moving goods across India. you expect them to arrive safely. But Indian highways carry risks: accidents, rain damage, overturning, or theft. Many business owners believe: 'If the goods get damaged, the transporter has to pay.' In reality, commercial shippers require specialized <a href='/services/commercial-insurance' class='text-blue-700 font-semibold hover:underline'>commercial goods insurance</a> to cover accidental transit damage."
      },
      {
        type: "heading",
        text: "1. Why the Transporter Will Not Pay"
      },
      {
        type: "paragraph",
        text: "Under Indian transport laws (Carriage by Road Act 2007), a truck owner is not an insurance company. Unless you paid special high charges upfront, the transporter's liability is capped at a tiny fixed amount per kilo or just the freight fee. Also, you have to prove in court that the driver was careless, which can take years."
      },
      {
        type: "heading",
        text: "2. How Marine Cargo Insurance Protects You"
      },
      {
        type: "paragraph",
        text: "A Marine Cargo (Inland Transit) policy works on an 'All Risks' basis. If the truck overturns, catches fire, or gets looted, your insurance company pays the full invoice value of your goods directly to your bank account. You do not have to fight with the transporter."
      },
      {
        type: "heading",
        text: "3. What Happens After You Get Paid?"
      },
      {
        type: "paragraph",
        text: "Once your insurance company pays you, they take over the right to recover money from the trucking company (called subrogation). To help them do this, you just need to give the transporter a formal written complaint within a few days of delivery."
      },
      {
        type: "heading",
        text: "4. Golden Rules When Receiving Damaged Goods"
      },
      {
        type: "list",
        items: [
          "Never sign a clean delivery receipt if boxes are crushed, torn, or wet.",
          "Ask the truck driver for an 'Open Delivery Certificate' and write the damage clearly on the lorry receipt (LR).",
          "Take clear photos and video of the damaged boxes inside the truck before unloading.",
          "Buy an annual Marine Open Policy so every single dispatch is automatically protected."
        ]
      }
    ]
  }
];

async function seedEmployeeBlogs() {
  console.log(`Starting to seed ${EMPLOYEE_BLOG_POSTS.length} employee-authored blogs in simple English...`);

  for (const post of EMPLOYEE_BLOG_POSTS) {
    console.log(`Upserting post: "${post.title}" by ${post.author.name} (slug: ${post.slug})...`);
    const parsedDate = new Date(post.date);

    const dbPost = await prisma.blogPost.upsert({
      where: { slug: post.slug },
      update: {
        title: post.title,
        excerpt: post.excerpt,
        category: post.category,
        readTime: post.readTime,
        date: parsedDate,
        authorName: post.author.name,
        authorRole: post.author.role,
        coverImage: post.coverImage,
        published: true,
      },
      create: {
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        category: post.category,
        readTime: post.readTime,
        date: parsedDate,
        authorName: post.author.name,
        authorRole: post.author.role,
        coverImage: post.coverImage,
        published: true,
      },
    });

    // Clean up existing sections
    await prisma.blogSection.deleteMany({
      where: { blogPostId: dbPost.id },
    });

    // Create sections
    if (post.sections && post.sections.length > 0) {
      const sectionsData = post.sections.map((sec, idx) => ({
        blogPostId: dbPost.id,
        type: sec.type,
        text: sec.type === "list" ? null : (sec.text || ""),
        items: sec.type === "list" ? (sec.items || []) : null,
        order: idx,
      }));

      await prisma.blogSection.createMany({
        data: sectionsData,
      });
    }
  }

  console.log("Successfully seeded all 10 employee blogs in simple English into PostgreSQL!");
}

seedEmployeeBlogs()
  .catch((err) => {
    console.error("Error seeding employee blogs:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

module.exports = { EMPLOYEE_BLOG_POSTS };
