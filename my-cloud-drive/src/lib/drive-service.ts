export const fetchDriveFiles = async (accessToken: string) => {
    const res = await fetch("https://www.googleapis.com/drive/v3/files", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    if (!res.ok) throw new Error("Failed to fetch drive files")
    return res.json()
  }
  