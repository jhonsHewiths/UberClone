import * as FileSystem from 'expo-file-system/legacy'; 

export const uploadImageToFirebase = async (uri, folderName) => {

  if (!uri || typeof uri !== 'string' || uri.startsWith('http')) return uri; 

  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const base64Img = `data:image/jpeg;base64,${base64}`;

    const body = JSON.stringify({
      file: base64Img,
      upload_preset: 'fotoPrueba', 
      folder: folderName,
    });

    const response = await fetch('https://api.cloudinary.com/v1_1/kahvuywp/image/upload', {
      method: 'POST',
      body: body,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const fileData = await response.json();

    if (fileData.secure_url) {
      return fileData.secure_url;
    } else {
      throw new Error(fileData.error?.message || 'Error al subir la imagen a Cloudinary');
    }
  } catch (error) {
    console.error("Error en Cloudinary (Base64):", error);
    throw error;
  }
};