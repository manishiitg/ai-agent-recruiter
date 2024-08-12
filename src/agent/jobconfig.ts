export const near_location = "Delhi, Noida, Ghaziabad, Meerut, Himachal, Nanital, Faridabad, Jaipur, Agra, Mathura, Prayagraj, Greater Noida, Hapur, Uttar Pradesh, Uttrakhand";
const exclude_location_rule = "Pune, Hyderabad, Kerela, Bangalore, Gwalior, Mumbai, Kolkata, Madras, Odisha, Indore, Pondicherry, West Bengal, Tamil Nadu, Andra Pradesh, Chennai";
// const exclude_location_rule = "Odisha";

export const NUMBER_OF_INTERVIEW_QUESTIONS = 3

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
    is_open: true,
    job_description: `This opening is only for candidates from 0 to 1 year of experience.
    Good Knowledge in javascript, reactjs`,
    full_criteria: `
    Rule 2. Candidate should not belong to locations ${exclude_location_rule}
    Rule 3. Candidate should have maximum salary of 30,000 per month or 4LPA per year. If candidates salary is not mentioned, assume he passes this criteria.
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
      `questions regarding css`,
      `difficult questions regarding css3 and flex`,
      `difficult questions regarding css3`,
    ],
  },
  "Jr Vuejs Developer": {
    is_open: false,
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
    // full_criteria: `
    // Rule 2. Candidate should have maximum salary of 40,000 per month. If candidates salary is not mentioned, assume he passes this criteria.
    // Rule 3. Candidate should have done multiple experiance/projects/internship related to nodejs. This is an important rule.`,
    full_criteria: `
    - Candidate should not belong to locations ${exclude_location_rule}
    - Candidate should have maximum salary of 50,000 per month or 6LPA per year. If candidates salary is not mentioned, assume he passes this criteria.
    - Candidate should have done multiple experiance/projects/internship related to nodejs. This is an important rule.`,
    resume_rating: `
    Rate the following Node.js developer candidate on a scale of 1-10 based on their demonstrated proficiency in the following areas:
    Keep point no 1 to 7 as most priority, if even one of things mentioned in these points are not mentioned in resume reduce more points.
    Also try to keep rating as diverse as possible to filter out good node.js developer, there might be 1000s of resume and we want to filter best
    1. Candidate should have done multiple internships related to Node.js.
    2. Candidate should have worked on projects using Express.js.
    3. Core Node.js concepts: event loop, asynchronous programming, modules, and core APIs.
    4. JavaScript proficiency: ES6+ syntax, data structures, algorithms, and functional programming paradigms.
    5.Framework/library expertise: Experience with popular Node.js frameworks (Express, NestJS, Koa) and libraries (Mongoose, Sequelize).
    6. Database interactions: Proficiency in MongoDB, PostgreSQL, or other relevant databases.
    7. API development: RESTful and GraphQL API design and implementation.
    8. Testing: Unit, integration, and end-to-end testing methodologies.
    9. Problem-solving and debugging skills: Ability to identify, analyze, and resolve complex issues.
    10. Code quality and maintainability: Adherence to best practices, clean code principles, and code readability.`,
    questions_to_ask: [
      // `candidate introduction about yourself and your projects`,
      // `technical question related to expressjs and rest apis`,
      `technical question related to expressjs and rest apis`,
      // `assume there is an array on integers and we need to find the nth largest element in the array. what would be your approach to find this. don't use sorting, need to use for loops and solve this problem in O(n) time complexity. let me know what be your approach`,
      `technical question related to nodejs`,
      // `technical question related to nodejs`,
      `technical question related to nodejs and database`,
      `technical question related to nodejs and database`
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
    - Candidate should not belong to locations ${exclude_location_rule}
    - Candidate should have maximum salary of 50,000 per month or 6LPA per year. If candidates salary is not mentioned, assume he passes this criteria.
    - Candidate should have done multiple work/projects/internship related python. This is an important rule`,
    resume_rating: `
      Certainly! Here's a similar rating criteria for a Python developer candidate on a scale of 1-10, keeping points 1 to 7 as the highest priority:
      Candidate should have completed multiple internships related to Python development.
      Candidate should have worked on projects using web frameworks like Django or Flask.
      Core Python concepts: understanding of Python's execution model, data structures, and object-oriented programming.
      Python proficiency: Python 3.x syntax, list comprehensions, generators, decorators, and functional programming paradigms.
      Framework/library expertise: Experience with popular Python frameworks (Django, Flask, FastAPI) and libraries (NumPy, Pandas, Requests).
      Database interactions: Proficiency in SQL databases (PostgreSQL, MySQL) and ORM tools (SQLAlchemy, Django ORM).
      API development: RESTful API design and implementation, familiarity with API frameworks like Django REST framework.
      Testing: Unit testing with pytest or unittest, integration testing, and test-driven development (TDD) practices.
      Problem-solving and algorithmic skills: Ability to solve complex problems and implement efficient algorithms.
      Code quality and maintainability: Adherence to PEP 8 style guide, clean code principles, and code readability.
      When evaluating candidates, prioritize points 1-7. If a candidate lacks experience in any of these areas, reduce their score more significantly. Aim to create diverse ratings to effectively filter out the best Python developers from potentially thousands of resumes.`,
    questions_to_ask: [
      // `candidate introduction about yourself and your projects`,
      `technical question related to python`,
      // `assume there is an array on integers and we need to find the nth largest element in the array. what would be your approach to find this. don't use sorting, need to use for loops and solve this problem in O(n) time complexity. let me know what be your approach`,
      `technical question related to django`,
      `technical question related to flask`,
      `technical question related to python`,
      `technical question related to rest api in python`,
      `technical question related to python`
    ],
  },
  "Python Internship (Cuvette)": {
    is_open: false,
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
