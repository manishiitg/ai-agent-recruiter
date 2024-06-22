export const near_location = "Delhi, Noida, Ghaziabad, Meerut, Himachal, Nanital, Faridabad, Jaipur, Agra, Mathura, Prayagraj, Greater Noida, Hapur, Uttar Pradesh, Uttrakhand";
const exclude_location_rule = "Pune, Hyderabad, Kerela, Bangalore, Chandigarh, Gwalior, Mumbai, Kolkata, Madras, Odisha, Kerala, Indore, Pondicherry, West Bengal, Ahmedabad";

export const linkedJobProfileRules: Record<
  string,
  {
    full_criteria: string;
    is_open: boolean;
    job_description: string;
  }
> = {
  "Jr HR Executive": {
    is_open: false,
    job_description: `Handle Recruitment - IT positions
    Manage day to day operation tasks like onboarding, employee engagement, inventory management, documentations, exit formalities.
    Coordinate with the technical leads for hiring requirements
    Handle social media profiles`,
    full_criteria: `Rule 1. Candidate location should be any of ${near_location}. 
    Rule 2. Candidate should not belong to locations ${exclude_location_rule}
    Rule 3. Candidate should have maximum salary of 40,000 per month. If candidates salary is not mentioned, assume he passes this criteria.
    Rule 4. Candidate should not have more than 1year of Experience. 
    Rule 5. Candidate should have worked on recuitment, interview scheduling, linkedin. 
    Rule 6. Candidate should have worked on projects/internship related to recruitment, hiring, hr administration.
    Rule 7. Candidate should only be a female.`,
  },
  "Jr NodeJs Developer": {
    is_open: true,
    job_description: `Good Knowledge in expressjs or typescript or other nodejs frameworks.
    Worked with databases like mongodb or mysql or postgresql`,
    full_criteria: `Rule 1. Candidate should not belong to locations ${exclude_location_rule}
    Rule 2. Candidate should have maximum salary of 40,000 per month. If candidates salary is not mentioned, assume he passes this criteria.
    Rule 3. Candidate should have done multiple experiance/projects/internship related to nodejs. This is an important rule.
    Rule 4. Candidate should have done projects using expressjs. This is an important rule.`,
  },
  "Jr Web Developer": {
    is_open: false,
    job_description: `This opening is only for candidates from 0 to 1 year of experience.
    Good Knowledge in javascript, reactjs or vuejs`,
    full_criteria: `Rule 1. Candidate location should be any of ${near_location}.
    Rule 2. Candidate should not belong to locations ${exclude_location_rule}
    Rule 3. Candidate should have maximum salary of 40,000 per month. If candidates salary is not mentioned, assume he passes this criteria.
    Rule 4. Candidate should have done multiple experiance/projects/internship related reactjs or vuejs or javascript. This is an important rule.`,
  },
  "Jr React Developer": {
    is_open: false,
    job_description: `This opening is only for candidates from 0 to 1 year of experience.
    Good Knowledge in javascript, reactjs`,
    full_criteria: `Rule 1. Candidate location should be ${near_location}.
    Rule 2. Candidate should not belong to locations ${exclude_location_rule}
    Rule 3. Candidate should have maximum salary of 40,000 per month. If candidates salary is not mentioned, assume he passes this criteria.
    Rule 5. Candidate should have done multiple experiance/projects/internship related reactjs. This is an important rule.`,
  },
  "Jr Vuejs Developer": {
    is_open: false,
    job_description: `This opening is only for candidates from 0 to 1 year of experience.
    Good Knowledge in vuejs`,
    full_criteria: `Rule 1. Candidate location should be ${near_location}.
    Rule 2. Candidate should not belong to locations ${exclude_location_rule}
    Rule 3. Candidate should have maximum salary of 40,000 per month. If candidates salary is not mentioned, assume he passes this criteria.
    Rule 4. Candidate should not have more than 1year of Experience.
    Rule 5. Candidate should have done multiple work/projects/internship related vuejs. This is an important rule.`,
  },
  "Jr Python Developer": {
    is_open: true,
    job_description: `Good Knowledge in django or flask
    Worked with databases like mongodb or mysql or postgresql`,
    full_criteria: `Rule 1. Candidate should have maximum salary of 40,000 per month. If candidates salary is not mentioned, assume he passes this criteria.
    Rule 2. Candidate should not belong to locations ${exclude_location_rule}
    Rule 4. Candidate should have done multiple work/projects/internship related python and flask/django. This is an important rule.`,
  },
  "Jr PHP Developer": {
    is_open: false,
    job_description: `This opening is only for candidates from 0 to 1 year of experience.
    Good Knowledge in php`,
    full_criteria: `Rule 1. Candidate location should be ${near_location}.
    Rule 2. Candidate should not belong to locations ${exclude_location_rule}
    Rule 3. Candidate should have maximum salary of 40,000 per month. If candidates salary is not mentioned, assume he passes this criteria.
    Rule 5. Candidate should have done multiple work/projects/internship related php. This is an important rule.`,
  },
  "Jr PHP Developer Intern": {
    is_open: false,
    job_description: `This opening is only for candidates from 0 to 1 year of experience.
    Good Knowledge in php`,
    full_criteria: `Rule 1. Candidate location should be ${near_location}.
    Rule 2. Candidate should not belong to locations ${exclude_location_rule}
    Rule 3. Candidate should have maximum salary of 40,000 per month. If candidates salary is not mentioned, assume he passes this criteria.
    Rule 4. Candidate should not have more than 1year of Experience.
    Rule 5. Candidate should have done multiple work/projects/internship related php. This is an important rule.`,
  },
  "Business Development Executive": {
    is_open: false,
    job_description: `- Responsible for Online Bidding on portals like UpWork, Freelancer, Guru etc.
    - Pre-sales in the web and mobile development domain, responsible for generating new business relationship
    - Sales Analysis, Prospecting, Cold Calling, Presentation, Follow up, Consulting
    - Client Acquisition, Bid Management, Account conversion and Client servicing
    `,
    full_criteria: `Rule 1. Candidate location should be any of ${near_location}.
    Rule 2. Candidate should not belong to locations ${exclude_location_rule}
    Rule 3. Candidate should have maximum salary of 100,000 per month. If candidates salary is not mentioned, assume he passes this criteria.
    Rule 4. Candidate should not have more than 10year of Experience.
    Rule 5. Candidate should have worked on work he should have worked in linkedin lead generation or email marketin or lead generation or project bidding
    Rule 6. Knows about Linkedin or Email Marketing or B2B Sales or Upwork or Lead Generation`,
  },
};
