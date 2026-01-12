import Handlebars from 'handlebars';

export const RESUME_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        @page {
            size: A4;
            margin: 0;
        }

        html, body {
            width: 210mm;
            min-height: 297mm;
            overflow: hidden;
        }

        body {
            font-family: 'Inter', sans-serif;
            color: #1f2937;
            line-height: 1.4;
            margin: 0;
            padding: 30px;
            font-size: 9.5pt;
            background: #ffffff;
        }

        /* Header */
        header {
            border-bottom: 2px solid #1f2937;
            padding-bottom: 12px;
            margin-bottom: 15px;
        }
        
        h1.name {
            font-size: 22pt;
            font-weight: 800;
            text-transform: uppercase;
            margin: 0 0 4px 0;
            letter-spacing: 1px;
            color: #111827;
        }
        
        .contact-info {
            font-size: 8.5pt;
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            color: #4b5563;
        }

        .contact-info span {
            white-space: nowrap;
        }

        /* Sections */
        section { 
            margin-bottom: 12px; 
            page-break-inside: avoid;
        }

        h2.section-title {
            font-size: 10pt;
            font-weight: 800;
            text-transform: uppercase;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 3px;
            margin-bottom: 8px;
            color: #111827;
            letter-spacing: 0.5px;
            margin-top: 0;
        }

        /* Entries */
        .entry {
            margin-bottom: 10px;
            page-break-inside: avoid;
        }

        .entry-header {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            margin-bottom: 2px;
        }

        .title { 
            font-weight: 700; 
            font-size: 9.5pt; 
            color: #111827;
        }
        
        .company { 
            font-weight: 600; 
            color: #374151; 
        }
        
        .date { 
            font-size: 8.5pt; 
            color: #6b7280; 
            font-weight: 500; 
            white-space: nowrap;
        }
        
        ul { 
            margin: 3px 0 8px 16px; 
            padding: 0; 
            list-style-type: disc;
        }
        
        li { 
            margin-bottom: 2px; 
            font-size: 9pt; 
            color: #374151;
            line-height: 1.35;
        }

        /* Summary */
        p {
            margin: 0;
            text-align: justify;
            line-height: 1.4;
            font-size: 9pt;
        }

        /* Skills */
        .skills-content {
            font-size: 9pt;
            color: #374151;
            line-height: 1.5;
        }

        /* Projects */
        .project-tech {
            font-size: 8.5pt;
            color: #4b5563;
            font-style: italic;
            margin-bottom: 3px;
        }

        /* Print optimization */
        @media print {
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
    </style>
</head>
<body>
    <header>
        <h1 class="name">{{header.name}}</h1>
        <div class="contact-info">
            {{#if header.email}}<span>{{header.email}}</span>{{/if}}
            {{#if header.phone}}<span> | {{header.phone}}</span>{{/if}}
            {{#if header.linkedin}}<span> | {{header.linkedin}}</span>{{/if}}
            {{#if header.github}}<span> | {{header.github}}</span>{{/if}}
            {{#if header.portfolioURL}}<span> | {{header.portfolioURL}}</span>{{/if}}
        </div>
    </header>

    {{#if summary}}
    <section>
        <h2 class="section-title">Professional Summary</h2>
        <p>{{summary}}</p>
    </section>
    {{/if}}

    {{#if skills}}
    <section>
        <h2 class="section-title">Technical Skills</h2>
        <div class="skills-content">{{skills}}</div>
    </section>
    {{/if}}

    {{#if experience}}
    <section>
        <h2 class="section-title">Experience</h2>
        {{#each experience}}
        <div class="entry">
            <div class="entry-header">
                <div><span class="title">{{role}}</span>{{#if company}}, <span class="company">{{company}}</span>{{/if}}</div>
                {{#if duration}}<div class="date">{{duration}}</div>{{/if}}
            </div>
            {{#if bullets}}
            <ul>
                {{#each bullets}}<li>{{this}}</li>{{/each}}
            </ul>
            {{/if}}
        </div>
        {{/each}}
    </section>
    {{/if}}

    {{#if projects}}
    <section>
        <h2 class="section-title">Key Projects</h2>
        {{#each projects}}
        <div class="entry">
            <div class="entry-header">
                <div><span class="title">{{title}}</span></div>
            </div>
            {{#if technologies}}<div class="project-tech">Stack: {{technologies}}</div>{{/if}}
            {{#if bullets}}
            <ul>
                {{#each bullets}}<li>{{this}}</li>{{/each}}
            </ul>
            {{/if}}
        </div>
        {{/each}}
    </section>
    {{/if}}

    {{#if education}}
    <section>
        <h2 class="section-title">Education</h2>
        {{#each education}}
        <div class="entry">
            <div class="entry-header">
                <div><span class="title">{{degree}}</span>{{#if university}}, <span class="company">{{university}}</span>{{/if}}</div>
                {{#if year}}<div class="date">{{year}}</div>{{/if}}
            </div>
        </div>
        {{/each}}
    </section>
    {{/if}}

    {{#if awards}}
    <section>
        <h2 class="section-title">Awards & Honors</h2>
        {{#each awards}}
        <div class="entry">
            <div class="entry-header">
                <div><span class="title">{{title}}</span>{{#if organization}}, <span class="company">{{organization}}</span>{{/if}}</div>
                {{#if year}}<div class="date">{{year}}</div>{{/if}}
            </div>
            {{#if description}}<div style="font-size: 9.5pt; color: #4b5563; margin-top: 2px;">{{description}}</div>{{/if}}
        </div>
        {{/each}}
    </section>
    {{/if}}

    {{#if publications}}
    <section>
        <h2 class="section-title">Publications & Speaking</h2>
        {{#each publications}}
        <div class="entry">
            <div class="entry-header">
                <div><span class="title">{{title}}</span>{{#if venue}}, <span class="company">{{venue}}</span>{{/if}}</div>
                {{#if year}}<div class="date">{{year}}</div>{{/if}}
            </div>
            {{#if description}}<div style="font-size: 9.5pt; color: #4b5563; margin-top: 2px;">{{description}}</div>{{/if}}
        </div>
        {{/each}}
    </section>
    {{/if}}
</body>
</html>
`;

export const compileTemplate = (data: any): string => {
    const template = Handlebars.compile(RESUME_TEMPLATE);
    return template(data);
};

