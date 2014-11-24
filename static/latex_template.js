var template_open = " \
\\documentclass[12pt]{book}\n \
\\usepackage{amsmath, amssymb, amsthm}\n \
\\usepackage{versions}\n \
\\usepackage{graphicx}\n \
\\usepackage{hyperref}\n \
\\usepackage{epstopdf}\n \
\\usepackage{calc}\n \
\\theoremstyle{definition}\n \
\\newtheorem*{sol*}{Solution}\n \
\\newcommand{\\emccyear}[1]{\\newcommand{\\printyear}{#1}}\n \
\\newcommand{\\emccdate}[1]{\\newcommand{\\printdate}{#1}}\n \
\\newcommand{\\acknowledge}[2]{\\item{\\em{\\bf #1}} \\quad #2}\n \
\\newcommand{\\smallemcclogo}{\\begin{center} \\includegraphics{../include/emcclogo} \\end{center}}\n \
\\newcommand{\\bigemcclogo}{\\begin{center} \\includegraphics{../include/emcclogolarge} \\end{center}}\n \
\\newcommand{\\appendnote}[1]{\\vspace{6pt} \\\\ Note: #1}\n \
\\newcommand{\\altsol}{\\vspace{6pt} {\\bf Alternate solution:} }\n \
\\newcommand{\\dg}{^{\\circ}}\n \
\\newcommand{\\points}[1]{\n \
\\processifversion{alltest}{{[}#1{]}}\n \
\\processifversion{solotest}{{[}#1{]}}\n \
\\processifversion{ans}{}\n \
\\processifversion{sol}{}\n \
}\n \
\\newcommand{\\problem}[1]{\n \
\\processifversion{alltest}{\\item #1}\n \
\\processifversion{solotest}{\\item #1}\n \
\\processifversion{ans}{}\n \
\\processifversion{sol}{\\item #1}\n \
}\n \
\\newcommand{\\solution}[2]{\n \
\\processifversion{alltest}{}\n \
\\processifversion{solotest}{}\n \
\\processifversion{sol}{\\begin{sol*}The answer is \\fbox{#1}. \\\\ \\\\ #2 \\end{sol*} }\n \
\\processifversion{ans}{\\item #1}\n \
}\n \
\\newcommand{\\gutsround}[1]{\n \
\\processifversion{alltest}{\\subsection{Round #1}}\n \
\\processifversion{solotest}{\\subsection*{Round #1}}\n \
\\processifversion{ans}{\\subsection*{Round #1}}\n \
\\processifversion{sol}{\\subsection{Round #1}}\n \
}\n \
\\newcommand{\\gutsendround}{\n \
\\processifversion{alltest}{\\smallemcclogo}\n \
\\processifversion{solotest}{\\rule{\\linewidth-\\textwidth}{0.4pt} \\rule{\\textwidth}{0.4pt} }\n \
\\processifversion{ans}{}\n \
\\processifversion{sol}{}\n \
}\n \
\\newcommand{\\gutspagebreak}{\n \
\\processifversion{alltest}{}\n \
\\processifversion{solotest}{\\newpage}\n \
\\processifversion{ans}{}\n \
\\processifversion{sol}{}\n \
}\n \
\\newcommand{\\specialmessage}[1]{\n \
\\processifversion{alltest}{#1}\n \
\\processifversion{solotest}{#1}\n \
\\processifversion{ans}{}\n \
\\processifversion{sol}{#1}\n \
}\n \
\\emccyear{" + round_year + "}\n \
\\emccdate{January 31, 2015}\n \
\\setlength{\\textheight}{8in}\n \
\\setlength{\\textwidth}{6.5in}\n \
\\setlength{\\topmargin}{0.0in}\n \
\\setlength{\\headheight}{0.5in}\n \
\\setlength{\\headsep}{0.3in}\n \
\\setlength{\\oddsidemargin}{-0.2in}\n \
\\setlength{\\evensidemargin}{-0.2in}\n \
\\setlength{\\parindent}{1pc}\n \
\\usepackage{fancyhdr}\n \
\\usepackage{lastpage}\n \
\\pagestyle{fancy}\n \
\\lhead{" + round_name + "}\n \
\\chead{\\sl Exeter Math Club Competition \\printyear\\ }\n \
\\rhead{page \\thepage\\ of \\pageref{LastPage}}\n \
\\lfoot{}\n \
\\cfoot{}\n \
\\rfoot{}\n \
\\begin{document}\n \
\\excludeversion{alltest}\n \
\\includeversion{solotest}\n \
\\excludeversion{sol}\n \
\\excludeversion{ans}\n \
{\\LARGE {\\bf " + round_name + "}}\n \
\\begin{flushright}\n \
{\\bf \\printdate\\ }\n \
\\end{flushright}\n \
\n \
{\\em \\noindent There are " + round_length + " problems, worth " + round_points + " points each, to be solved in " + round_time + " minutes. Answer each question to the best of your ability. Answers must be simplified and exact unless otherwise specified. There is no penalty for guessing. Be careful and don't rush.}\n \
\n \
\\begin{enumerate}\n";

var template_close = '\\end{enumerate}\n \
\n \
\\end{document}';

