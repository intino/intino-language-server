/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox and others.
 * Licensed under the MIT License. See LICENSE in the package root for license information.
 * ------------------------------------------------------------------------------------------ */

import { configureMonacoWorkers, runClient } from "./wrapper";

configureMonacoWorkers();
runClient();