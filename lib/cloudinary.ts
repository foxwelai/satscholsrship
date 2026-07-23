// Cloudinary upload utility for student photos

export type PhotoType = "profile" | "passbook";

const FOLDER_MAP: Record<PhotoType, string> = {
  profile: "SA-Temple/Profile-Photo",
  passbook: "SA-Temple/Bank-Passbook-Photo",
};

export async function uploadToCloudinary(
  file: File,
  photoType: PhotoType,
  studentId: string
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "sat_temple_unsigned");
  formData.append("folder", FOLDER_MAP[photoType]);
  formData.append("public_id", `${studentId}_${photoType}_${Date.now()}`);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error("Upload failed");
    }

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw error;
  }
}

export function buildCloudinaryUrl(publicId: string, options: Record<string, any> = {}): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const defaultOptions = {
    w: 400,
    h: 500,
    c: "fill",
    q: "auto",
    ...options,
  };

  const queryString = Object.entries(defaultOptions)
    .map(([key, value]) => `${key}=${value}`)
    .join(",");

  return `https://res.cloudinary.com/${cloudName}/image/upload/${queryString}/${publicId}`;
}
