const runCode = async (code, language = "javascript") => {

  try {

    const res = await fetch("https://piston.hackclub.app/api/v2/execute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        language: language,
        version: "*",
        files: [
          {
            content: code
          }
        ]
      })
    });

    const data = await res.json();

    return data.run?.output || "No output";

  } catch (err) {
    return "Error running code";
  }

};