import {defineConfig,devices} from "@playwright/test";
export default defineConfig({
 testDir:"./e2e",
 timeout:30000,
 expect:{timeout:12000},
 retries:process.env.CI?1:0,
 workers:1,
 reporter:[["list"],["html",{open:"never",outputFolder:"playwright-report"}]],
 use:{baseURL:"http://127.0.0.1:3001",trace:"retain-on-failure",screenshot:"only-on-failure"},
 projects:[{name:"desktop-chromium",use:{...devices["Desktop Chrome"]}},{name:"mobile-chromium",use:{...devices["Pixel 7"]}}]
});
