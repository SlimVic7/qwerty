const fs = require('fs');
let code = fs.readFileSync('src/features/jobs/ops/jobsOps.test.tsx', 'utf8');

code = code.replace(
  /await fireEvent\.click\(screen\.getByRole\('button', \{ name: \/publish job\/i \}\)\);/g,
  "await fireEvent.click(screen.getByText('publish Job'));"
);

code = code.replace(
  /await fireEvent\.click\(screen\.getByRole\('button', \{ name: \/close job\/i \}\)\);/g,
  "await fireEvent.click(screen.getByText('close Job'));"
);

code = code.replace(
  /await fireEvent\.click\(screen\.getByRole\('button', \{ name: \/feature job\/i \}\)\);/g,
  "await fireEvent.click(screen.getByText('feature Job'));"
);

code = code.replace(
  /await fireEvent\.click\(screen\.getByRole\('button', \{ name: \/unpublish job\/i \}\)\);/g,
  "await fireEvent.click(screen.getByText('unpublish Job'));"
);

code = code.replace(
  /await fireEvent\.click\(screen\.getByRole\('button', \{ name: \/archive job\/i \}\)\);/g,
  "await fireEvent.click(screen.getByText('archive Job'));"
);

fs.writeFileSync('src/features/jobs/ops/jobsOps.test.tsx', code);
