export const near_location = "Delhi, Noida, Ghaziabad, Meerut, Himachal, Nanital, Faridabad, Jaipur, Agra, Mathura, Prayagraj, Greater Noida, Hapur, Uttar Pradesh, Uttrakhand";
// const exclude_location_rule = "Pune, Hyderabad, Kerela, Bangalore, Chandigarh, Gwalior, Mumbai, Kolkata, Madras, Odisha, Kerala, Indore, Pondicherry, West Bengal, Ahmedabad, Tamil Nadu";
const exclude_location_rule = "Odisha";

export const NUMBER_OF_INTERVIEW_QUESTIONS = 5;

export const companyInfo = `
Company Name: Excellence Technosoft Pvt Ltd
Location: Noida
Work from Office Job
Alternate Saturdays are Off. 
`;

export const linkedJobProfileRules: Record<
  string,
  {
    full_criteria: string;
    is_open: boolean;
    job_description: string;
    resume_rating: string;
    questions_to_ask: string[];
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
    resume_rating: `
    - Candidate should have worked on projects/internship related to recruitment, hiring, hr administration.`,
    questions_to_ask: [`How do you hire candidates from naukri!`, `Whats your apprach to hire candidates from linkedin`],
  },
  "Jr Web Developer": {
    is_open: false,
    job_description: `This opening is only for candidates from 0 to 1 year of experience.
    Good Knowledge in javascript, reactjs or vuejs`,
    full_criteria: `Rule 1. Candidate location should be any of ${near_location}.
    Rule 2. Candidate should not belong to locations ${exclude_location_rule}
    Rule 3. Candidate should have maximum salary of 40,000 per month. If candidates salary is not mentioned, assume he passes this criteria.
    Rule 4. Candidate should have done multiple experiance/projects/internship related reactjs or vuejs or javascript. This is an important rule.`,
    resume_rating: `
    - Candidate should have done multiple experiance/projects/internship related to reactjs or vuejs.`,
    questions_to_ask: [`expressjs middleware`, `interact with mongodb`],
  },
  "Jr React Developer": {
    is_open: false,
    job_description: `This opening is only for candidates from 0 to 1 year of experience.
    Good Knowledge in javascript, reactjs`,
    full_criteria: `
    Rule 2. Candidate should not belong to locations ${exclude_location_rule}
    Rule 3. Candidate should have maximum salary of 40,000 per month. If candidates salary is not mentioned, assume he passes this criteria.
    Rule 5. Candidate should have done multiple experiance/projects/internship related reactjs. This is an important rule.`,
    // full_criteria: `Candidate should have done multiple experiance/projects/internship related reactjs. This is an important rule.`,
    resume_rating: `
    - Candidate should have done multiple experiance/projects/internship related to reactjs
    - experiance with technologies like aws, docker, google cloud are a plus point
    - simple html/css projects should be considered negative point`,
    questions_to_ask: [
      `candidate introduction about yourself and your projects`,
      `what is states vs props`,
      `question regarding useCallback and useMemo`,
      `question about state managment`,
      `i have a component which is rendering is a lot, how can i debug and stop the re-renders`,
    ],
  },
  "Jr Vuejs Developer": {
    is_open: true,
    job_description: `This opening is only for candidates from 0 to 1 year of experience.
    Good Knowledge in vuejs`,
    full_criteria: `Rule 2. Candidate should not belong to locations ${exclude_location_rule}
    Rule 3. Candidate should have maximum salary of 50,000 per month or 6LPA per year. If candidates salary is not mentioned, assume he passes this criteria.
    Rule 4. Candidate should not have more than 1year of Experience.
    Rule 5. Candidate should have done multiple work/projects/internship related vuejs. This is an important rule.`,
    // full_criteria: `Candidate should have done multiple work/projects/internship related vuejs/javascript. This is an important rule.`,
    resume_rating: `
    - Candidate should have done multiple experiance/projects/internship related to vuejs
    - experiance with technologies like aws, docker, google cloud are a plus point
    - simple html/css projects should be considered negative point`,
    questions_to_ask: [`candidate introduction about yourself and your projects`, `what is states vs props`, `question about state managment`, `vuejs interview questions`],
  },
  "Jr NodeJs Developer": {
    is_open: true,
    job_description: `Good Knowledge in expressjs or typescript or other nodejs frameworks.
    Worked with databases like mongodb or mysql or postgresql`,
    // full_criteria: `Rule 1. Candidate should not belong to locations ${exclude_location_rule}
    // Rule 2. Candidate should have maximum salary of 40,000 per month. If candidates salary is not mentioned, assume he passes this criteria.
    // Rule 3. Candidate should have done multiple experiance/projects/internship related to nodejs. This is an important rule.`,
    full_criteria: `-Rule 1. Candidate should have maximum salary of 50,000 per month or 6LPA per year. If candidates salary is not mentioned, assume he passes this criteria.
    - Candidate should have done multiple experiance/projects/internship related to nodejs. This is an important rule.`,
    resume_rating: `
    - Candidate should have done multiple projects/internship related to nodejs.
    - Candidate should have worked on projects using expressjs. `,
    questions_to_ask: [
      `candidate introduction about yourself and your projects`,
      `expressjs middleware`,
      `interact with mongodb`,
      `assume there is an array on integers and we need to find the nth largest element in the array. what would be your approach to find this. don't use sorting, need to use for loops and solve this problem in O(n) time complexity. let me know what be your approach`,
      `nodejs async vs promises`,
      `nodejs event loop`,
    ],
  },
  "Jr Python Developer": {
    is_open: true,
    job_description: `Good Knowledge in django or flask
    Worked with databases like mongodb or mysql or postgresql`,
    // full_criteria: `Rule 1. Candidate should have maximum salary of 40,000 per month. If candidates salary is not mentioned, assume he passes this criteria.
    // Rule 2. Candidate should not belong to locations ${exclude_location_rule}
    // Rule 4. Candidate should have done multiple work/projects/internship related python and flask/django. This is an important rule.`,
    full_criteria: `
    - Rule 1. Candidate should have maximum salary of 50,000 per month or 6LPA per year. If candidates salary is not mentioned, assume he passes this criteria.
    - Candidate should have done multiple work/projects/internship related python. This is an important rule.`,
    resume_rating: `
    - Candidate should have done multiple projects/internship related to python
    - Candidate should have done multiple projects/internship related mongodb or mysql database
    - If candidate has worked on projects related to machine learning, this should reduce resume rating.
    - Candidate should ideally have worked in web development or api development and not pure ML projects.
    - experiance with technologies like aws, docker, google cloud are a plus point
    - simple html/css projects should be considered negative point`,
    questions_to_ask: [
      `candidate introduction about yourself and your projects`,
      `what is list comprehension in python`,
      `how do you perform raw SQL queries in Django`,
      `assume there is an array on integers and we need to find the nth largest element in the array. what would be your approach to find this. don't use sorting, need to use for loops and solve this problem in O(n) time complexity. let me know what be your approach`,
      `what middleware is in Django`,
      `what is left join in mysql`,
    ],
  },
  "Python Internship (Cuvette)": {
    is_open: true,
    job_description: `Good Knowledge in django or flask
    Worked with databases like mongodb or mysql or postgresql`,
    // full_criteria: `Rule 1. Candidate should have maximum salary of 40,000 per month. If candidates salary is not mentioned, assume he passes this criteria.
    // Rule 2. Candidate should not belong to locations ${exclude_location_rule}
    // Rule 3. Candidate should not have more than 1year of Experience.
    // Rule 4. Candidate should have done multiple work/projects/internship related python and flask/django. This is an important rule.`,
    full_criteria: `
    - Rule 1. Candidate should have maximum salary of 50,000 per month or 6LPA per year. If candidates salary is not mentioned, assume he passes this criteria.
    - Candidate should have done multiple work/projects/internship related python. This is an important rule.`,
    resume_rating: `
    - Candidate should have done multiple experiance/projects/internship related to python and flask/django
    - Candidate should have done multiple experiance/projects/internship related mongodb or mysql database
    - If candidate has worked on projects related to machine learning, this should reduce resume rating.
    - Candidate should ideally have worked in web development or api development and not pure ML projects.
    - experiance with technologies like aws, docker, google cloud are a plus point
    - simple html/css projects should be considered negative point`,
    questions_to_ask: [
      `candidate introduction about yourself and your projects`,
      `what is list comprehension in python`,
      `assume there is an array on integers and we need to find the nth largest element in the array. what would be your approach to find this. don't use sorting, need to use for loops and solve this problem in O(n) time complexity. let me know what be your approach`,
      `how do you perform raw SQL queries in Django`,
      `what middleware is in Django`,
      `what is left join in mysql`,
    ],
  },
  "Jr PHP Developer": {
    is_open: false,
    job_description: `This opening is only for candidates from 0 to 1 year of experience.
    Good Knowledge in php`,
    full_criteria: `Rule 1. Candidate location should be ${near_location}.
    Rule 2. Candidate should not belong to locations ${exclude_location_rule}
    Rule 3. Candidate should have maximum salary of 40,000 per month. If candidates salary is not mentioned, assume he passes this criteria.
    Rule 5. Candidate should have done multiple work/projects/internship related php. This is an important rule.`,
    resume_rating: `
    - Candidate should have done multiple experiance/projects/internship related to laravel.
    - Candidate should have done multiple experiance/projects/internship related mongodb or mysql database`,
    questions_to_ask: [`candidate introduction about yourself and your projects`, "questions about php", "questions about laravel"],
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
    resume_rating: `
    - Candidate should have done multiple experiance/projects/internship related to laravel.
    - Candidate should have done multiple experiance/projects/internship related mongodb or mysql database`,
    questions_to_ask: [`what is states vs props`],
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
    resume_rating: `
    - Candidate should have done multiple experiance/projects/internship related to Linkedin or Email Marketing or B2B Sales or Upwork or Lead Generation`,
    questions_to_ask: [`what is states vs props`],
  },
};
