const RUNNING = 0;
const PAUSED = 1;

function changeState(state) {
    if (state === RUNNING) {
        document.getElementById("status").textContent = "RUNNING";
        document.getElementById("toggleEnabled").checked = true;
        document.getElementById("status").classList.remove("bg-red-300");
        document.getElementById("status").classList.add("bg-green-300");
    } else if (state === PAUSED || state === undefined) {
        document.getElementById("status").textContent = "PAUSED";
        document.getElementById("toggleEnabled").checked = false;
        document.getElementById("status").classList.remove("bg-green-300");
        document.getElementById("status").classList.add("bg-red-300");
    } else {
        console.error("Unknown state:", state);
    }
}

// Update UI to current state.
browser.storage.local.get("state").then(storage => changeState(storage.state));

// Listen for state changes.
browser.storage.onChanged.addListener((changes) => changeState(changes.state.newValue));

document.getElementById("toggleEnabled").addEventListener("click", async event => {
    if (event.target.checked === true) {
        browser.runtime.sendMessage({ type: "rally-sdk.change-state", data: { state: "resume" } });
    } else {
        browser.runtime.sendMessage({ type: "rally-sdk.change-state", data: { state: "pause" } });
    }
});

//Display last query (add ID "get_last_query" )
document.getElementById("get_last_query").addEventListener("click", async()=>{

    //get data from local storage.
    const data = await browser.storage.local.get(null);

    const allQueries = Object.values(data);
     // if empty, return "no query yet!"
    if (allQueries.length == 0) return;

    const sortedQueries = allQueries.sort((query1, query2) => {
        if (query1.pageVisitStartTime > query2.pageVisitStartTime) {
            return -1;
        }
        if (query1.pageVisitStartTime < query2.pageVisitStartTime) {
            return 1;
        } 
        return 0;
    });
    const mostRecentQuery = allQueries[0];
    

    // checking that mostRecentQuery is a valid object
    if (mostRecentQuery?.pageVisitStartTime) {
        // parse query url to get query term (manually)
        const query = mostRecentQuery.url;
        const queryString = query.split('q=')[1];
        const queryTerm = queryString.replaceAll('+', ' ')
        document.getElementById('most-recent-query').innerHTML = queryTerm;
        // URLSearchParams doesn't work because the url params are different for each queryable website (youtube, google, etc.)
        // so need to account when parsing the urls

        // (entire URL) set UI box content with the most recent query
        // document.getElementById('most-recent-query').innerHTML = mostRecentQuery.url;
    }

    console.log('sortedQueries', sortedQueries);
    // console.log('queryterm', queryterm)
    console.log(queryString.getAll('queryTerm'))

})

document.getElementById("download").addEventListener("click", async () => {
    // Get all data from local storage.
    const data = await browser.storage.local.get(null);
    console.debug("Converting JSON to CSV:", data);

    // Extract all object keys to use as CSV headers.
    const headerSet = new Set();
    for (const [key, val] of Object.entries(data)) {
        // Ignore bookeeping information.
        if (!["initialized", "state"].includes(key)) {
            for (const [header] of Object.entries(val)) {
                headerSet.add(header);
            }
        }
    }
    const headers = Array.from(headerSet);

    let csvData = "";

    // Print one line with each header.
    for (const [i, header] of headers.entries()) {
        csvData += `${header}`;
        if (i == headers.length - 1) {
            csvData += `\n`;
        } else {
            csvData += `,`;
        }
    }

    // Print the value for eachs measurement, in the same order as the headers on the first line.
    for (const [key, val] of Object.entries(data)) {
        // Ignore bookeeping information.
        if (!["initialized", "state"].includes(key)) {
            for (const [i, header] of headers.entries()) {
                csvData += `${val[header]}`;
                if (i == headers.length - 1) {
                    csvData += `\n`;
                } else {
                    csvData += `,`;
                }
            }
        }
    }

    const dataUrl = (`data:text/csv,${encodeURIComponent(csvData)}`);

    const downloadLink = document.getElementById("downloadLink");
    downloadLink.setAttribute("href", dataUrl);
    downloadLink.setAttribute("download", "rally-study-template.csv");
    downloadLink.click();
});
