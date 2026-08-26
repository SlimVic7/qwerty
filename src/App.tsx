/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from './app/Router.js';
import { AuthProvider } from './lib/auth.js';

export default function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}
