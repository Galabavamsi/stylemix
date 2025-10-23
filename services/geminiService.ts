
import { GoogleGenAI, Modality } from "@google/genai";
import type { AspectRatio } from "../types";

// FIX: Initialize the GoogleGenAI client.
// This assumes API_KEY is set in the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

// Helper function to convert a File object to a base64 string for the API
const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        // The result includes the data URL prefix (e.g., "data:image/jpeg;base64,"),
        // which we need to remove.
        resolve(reader.result.split(',')[1]);
      } else {
        // Handle ArrayBuffer case if necessary, though readAsDataURL should give string
        resolve('');
      }
    };
    reader.readAsDataURL(file);
  });
  return {
    inlineData: {
      data: await base64EncodedDataPromise,
      mimeType: file.type,
    },
  };
};

// Helper function to convert a base64 string to a part for the API
const base64ToGenerativePart = (base64Data: string, mimeType: string = 'image/jpeg') => {
  return {
    inlineData: {
      data: base64Data,
      mimeType,
    },
  };
};

export const generateLook = async (
  itemImages: File[],
  userImage: File | null,
  sceneDescription: string
): Promise<string> => {
    // FIX: Use gemini-2.5-flash-image for image generation tasks.
    const model = 'gemini-2.5-flash-image';
    const itemImageParts = await Promise.all(itemImages.map(fileToGenerativePart));

    const promptParts = [];

    let textPrompt = `Generate a photorealistic image of a person in the following scene: "${sceneDescription}". `;

    if (userImage) {
        textPrompt += "The person in the image should be the person from the provided user photo, wearing the following items. Blend the items naturally onto the person.";
        const userImagePart = await fileToGenerativePart(userImage);
        promptParts.push(userImagePart);
    } else {
        textPrompt += "The person should be an AI-generated model, wearing the following items. The items should look natural on the model.";
    }
    
    promptParts.unshift({ text: textPrompt });
    promptParts.push(...itemImageParts);

    const response = await ai.models.generateContent({
        model: model,
        contents: { parts: promptParts },
        config: {
            // FIX: responseModalities must be an array with a single Modality.IMAGE element.
            responseModalities: [Modality.IMAGE],
        },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }
    throw new Error("No image was generated.");
};


export const analyzeLookWithThinking = async (
  imageBase64: string,
  sceneDescription: string
): Promise<string> => {
    // FIX: Use gemini-2.5-pro for complex text tasks.
    const model = 'gemini-2.5-pro';
    const imagePart = base64ToGenerativePart(imageBase64, 'image/jpeg');
    const textPart = {
        text: `You are a world-class fashion stylist. Provide a detailed, professional fashion analysis of the outfit shown in the image, considering the described scene: "${sceneDescription}". Focus on style, color coordination, suitability for the occasion, and suggest potential improvements or alternative accessories.`
    };

    const response = await ai.models.generateContent({
        model: model,
        contents: { parts: [textPart, imagePart] },
        config: {
            // FIX: Enable thinking for more detailed analysis.
            thinkingConfig: { thinkingBudget: 8192 }
        }
    });

    // FIX: Extract text directly from the response.
    return response.text;
};

export const editImage = async (
  imageBase64: string,
  editPrompt: string
): Promise<string> => {
    // FIX: Use gemini-2.5-flash-image for image editing tasks.
    const model = 'gemini-2.5-flash-image';
    const imagePart = base64ToGenerativePart(imageBase64, 'image/jpeg');
    const textPart = { text: editPrompt };

    const response = await ai.models.generateContent({
        model: model,
        contents: { parts: [imagePart, textPart] },
        config: {
            // FIX: responseModalities must be an array with a single Modality.IMAGE element.
            responseModalities: [Modality.IMAGE],
        },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }
    throw new Error("Could not edit the image.");
};

export const generateImageFromText = async (
  prompt: string,
  aspectRatio: AspectRatio
): Promise<string> => {
    // FIX: Use imagen-4.0-generate-001 for high-quality image generation.
    const model = 'imagen-4.0-generate-001';
    
    const response = await ai.models.generateImages({
        model: model,
        prompt: prompt,
        config: {
          numberOfImages: 1,
          aspectRatio: aspectRatio,
          outputMimeType: 'image/jpeg',
        },
    });
    
    // FIX: Extract image bytes from the response.
    const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
    if (!base64ImageBytes) {
        throw new Error("Image generation failed.");
    }
    return base64ImageBytes;
};
