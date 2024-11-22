const axios = require('axios');

// Controller to handle the POST request
exports.getPlaceDetails = async (req, res) => {
    console.log("Request Body:", req.body); // Log the incoming body to check placeId
    const { placeId } = req.body; // Extract placeId from request body

    if (!placeId) {
        return res.status(400).json({ error: 'Place ID is required' });
    }

    try {
        // Fetch Google Place details from Google API
        const API_KEY = process.env.GOOGLE_MAPS_API_KEY; // Replace with your actual Google API key
        const placeUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${API_KEY}`;
        const placeResponse = await axios.get(placeUrl);

        if (placeResponse.data.status !== 'OK') {
            throw new Error(placeResponse.data.error_message || 'Failed to fetch place details');
        }

        // Extract place details from the Google API response
        const placeDetails = placeResponse.data.result;
        console.log("placeDetails", placeDetails);

        // Extract image URLs from photo references
        const photoUrls = placeDetails.photos ? placeDetails.photos.map(photo => {
            return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${API_KEY}`;
        }) : [];

        // Add photo URLs to the place details
        placeDetails.photoUrls = photoUrls;

        const response = {
            success: true,
            data: placeDetails,
        };

        console.log("Response Data:", response); // Log the outgoing response for debugging
        return res.status(200).json(response);
    } catch (error) {
        console.error("Error:", error); // Log the error for debugging
        return res.status(500).json({ success: false, error: error.message });
    }
};