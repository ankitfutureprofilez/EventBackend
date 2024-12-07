const Booking = require("../model/Booking");
const User = require("../model/User");
const catchAsync = require("../utils/catchAsync");
const sendEmail = require("../utils/EmailMailler");
const emailTemplate = require("../emailTemplates/Booking");
const PaymentLink = require("../emailTemplates/PaymentLink");
const nodemailer = require("nodemailer");
const { default: axios } = require("axios");
const payment = require("../model/payment");
const { errorResponse, successResponse } = require("../utils/ErrorHandling");



const BookingFilter = async (name) => {
  try {
    if (!name) {
      return res.status(400).json({
        status: false,
        message: "Name is required for filtering bookings.",
      });
    }
    const matchingUserIds = await User.find({
      username: { $regex: name, $options: "i" }
    }).distinct("_id");
    const bookings = await Booking.find({
      $or: [
        { package_name: { $regex: name, $options: "i" } },
        { userId: { $in: matchingUserIds } },
      ],
    }).populate({
      path: "userId",
      select: "username email",
    });
    return bookings;
  } catch (error) {
    console.error("Error fetching booking:", error);
    return res.status(500).json({
      status: false,
      message: "An error occurred while fetching bookings.",
      error: error.message,
    });
  }
};

exports.bookingpost = catchAsync(async (req, res) => {
  const userId = req?.User?._id;

  // Validate User ID
  if (!userId) {
    return res.status(400).json({
      status: false,
      message: "User information not found in the request or userId is undefined.",
    });
  }
  console.log("req.body", req.body)
  // Destructure request body
  const {
    Package,
    CurrencyCode,
    package_name,
    bookingDate,
    location,
    status,
    attendees,
    totalPrice,
  } = req.body;

  try {
    // Create the booking record
    const record = new Booking({
      package: Package,
      package_name,
      bookingDate,
      location,
      status,
      CurrencyCode,
      userId,
      attendees,
      totalPrice,
    });
    console.log("record", record)

    const data = await record.save();
    const userDetail = await User.findById(userId);
    if (!userDetail) {
      return res.status(404).json({
        status: false,
        message: "User not found.",
      });
    }
    const subject = "Booking request made successfully!";
    await sendEmail({
      email: process.env.EMAIL_USER,
      name: userDetail.username,
      package: data, // Pass the saved record
      message: "Your booking request was successful!",
      subject: subject,
      emailTemplate: emailTemplate,
    });
    await sendEmail({
      email: userDetail.email,
      name: userDetail.username,
      package: data, // Pass the saved record
      message: "Your booking request was successful!",
      subject: subject,
      emailTemplate: emailTemplate,
    });


    return res.status(201).json({
      status: true,
      message: "Booking successfully created!",
      data: record,
    });

  } catch (error) {
    console.error("Error during booking creation:", error);
    return res.status(500).json({
      status: false,
      message: "An error occurred while creating the booking.",
      error: error.message,
    });
  }

});


exports.BookingGet = catchAsync(async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const search = req.query.search || "";
    let BookingData, totalPages, totalBooking;
    if (search === "") {
      const skip = (page - 1) * limit;
      totalBooking = await Booking.countDocuments();
      BookingData = await Booking.find({})
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: "userId",
          select: "username email",
          //  model: 'User'
        });
      totalPages = Math.ceil(totalBooking / limit);
    }
    else {
      BookingData = await BookingFilter(search);
      totalPages = 1;
      totalBooking = BookingData;
    }
    res.status(200).json({
      data: {
        bookingdata: BookingData,
        totalBooking: totalBooking,
        totalPages: totalPages,
        currentPage: page,
        perPage: limit,
        nextPage: page < totalPages ? page + 1 : null,
        previousPage: page > 1 ? page - 1 : null,
      },
      msg: "Contact Get",
    });
  } catch (error) {
    res.status(500).json({
      msg: "Failed to fetch Contact get",
      error: error.message,
    });
  }
});

exports.BookingStatus = catchAsync(async (req, res) => {
  try {

    const { _id, status } = req.body;

    // Check if required fields are provided
    if (!_id || !status) {
      return res.status(400).json({
        message: "Booking ID and status are required.",
        status: false,
      });
    }

    // Find the booking by ID
    const bookingstatus = await Booking.findById(_id);

    if (!bookingstatus) {
      return res.status(404).json({
        message: "Booking not found",
        status: false,
      });
    }

    // Update the status
    bookingstatus.status = status;

    // Save the updated document
    await bookingstatus.save();

    // Respond with success message
    res.status(200).json({
      message: `Booking status updated and ${status}`,
      status: true,
      data: bookingstatus,
    });
  } catch (error) {
    console.error("Error updating booking status:", error);

    // Respond with an error message
    res.status(500).json({
      message: "Internal Server Error",
      status: false,
    });
  }
});

const currencySymbol = {
  USD: '$',
  EUR: '€',
  AED: 'د.إ',
  GBP: '£',
};

// The BookingPayment function
exports.BookingPayment = catchAsync(async (req, res) => {
  try {
    const { _id, payment_genrator_link } = req.body;
    if (!_id) {
      return res.status(400).json({
        message: "Booking ID is required.",
        status: false,
      });
    }
    const updatedRecord = await Booking.findByIdAndUpdate(
      _id,
      { payment_genrator_link },
      { new: true, runValidators: true }
    );
    const bookingstatus = await Booking.findById(_id).populate({
      path: "userId",
      select: "username email",
    });
    const paymentdata = await payment.findOne({ booking_id: _id });
console.log("paymentdata", paymentdata);
console.log(bookingstatus)
    const paymentLink = `https://user-event.vercel.app/payment/${bookingstatus?._id}`;
    const currencyCode = bookingstatus?.CurrencyCode || 'USD';
    const currency = currencySymbol[currencyCode] || '$';
    const emailHtml = PaymentLink(paymentLink, bookingstatus?.userId?.username, bookingstatus?.totalPrice, currency);
    let transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Send the email with the generated payment link
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: bookingstatus.userId?.email,
      subject: "Payment Link to confirm your Booking",
      html: emailHtml,
    });

    // Return a success response
    return successResponse(res, "Payment link sent successfully!");
  } catch (error) {
    console.error("Error updating booking status:", error);
    res.status(500).json({
      message: "Internal Server Error",
      status: false,
    });
  }
});

exports.BookingPrice = catchAsync(async (req, res) => {
  try {
    const { _id, price, currency } = req.body;
    if (!_id || !price) {
      return res.status(400).json({
        message: "Booking ID and price both are required.",
        status: false,
      });
    }
    const bookingstatus = await Booking.findById(_id);
    if (!bookingstatus) {
      return res.status(404).json({
        message: "Booking not found",
        status: false,
      });
    }
    bookingstatus.totalPrice = price;
    bookingstatus.CurrencyCode = currency;
    await bookingstatus.save();
    res.status(200).json({
      message: `Booking Price Updated`,
      status: true,
      data: bookingstatus,
    });
  } catch (error) {
    console.error("Error updating booking status:", error);
    res.status(500).json({
      message: "Internal Server Error",
      status: false,
    });
  }
});


exports.BookingGetByID = catchAsync(async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        message: "Booking ID is required.",
        status: false,
      });
    }

    const booking = await Booking.findById(id).populate({
      path: "userId",
      select: "username email phone_number phone_code",
    });

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found",
        status: false,
      });
    }

    // Define a function to fetch place details using Google Maps API
    const fetchPlaceDetails = async (placeId) => {
      try {
        const API_KEY = process.env.GOOGLE_MAPS_API_KEY; // Google API key
        const placeUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${API_KEY}`;
        const placeResponse = await axios.get(placeUrl);

        if (placeResponse.data.status !== 'OK') {
          throw new Error(placeResponse.data.error_message || 'Failed to fetch place details');
        }

        const placeDetails = placeResponse.data.result;

        // Extract photo URLs from photo references
        const photoUrls = placeDetails.photos ? placeDetails.photos.map(photo => {
          return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${API_KEY}`;
        }) : [];

        placeDetails.photoUrls = photoUrls; // Add photo URLs to place details
        return placeDetails;
      } catch (error) {
        console.error("Error fetching place details:", error);
        return null;
      }
    };
    const updatedPackage = await Promise.all(booking.package.map(async (pkg) => {
      if (pkg.place_id) {
        const placeDetails = await fetchPlaceDetails(pkg.place_id);
        if (placeDetails) {
          return { ...pkg, placeDetails }; // Merge place details into the package
        }
      }
      return pkg; // If place_id is missing or place details could not be fetched, return the original package
    }));

    // Update the booking with the new package details
    booking.package = updatedPackage;

    res.status(200).json({
      message: "Data retrieved successfully",
      status: true,
      data: booking,
    });
  } catch (error) {
    console.error("Error updating booking status:", error);
    res.status(500).json({
      message: "Internal Server Error",
      status: false,
    });
  }
});


exports.BookingDataId = catchAsync(async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        status: false,
        message: "Payment ID is required.",
      });
    }
    // Fetch the current package record by ID
    const packageRecord = await Booking.findById(id)
const paymentRecord = await payment.findOne({booking_id:packageRecord._id})
console.log("paymentRecord",paymentRecord)
    if (!packageRecord) {
      return res.status(404).json({
        status: false,
        message: "Booking not found!",
      });
    }

    res.status(200).json({
      status: true,
      data: paymentRecord,
      message: `Booking successfully.`,
    });

  } catch (error) {
    console.error("Error updating package record:", error);

    res.status(500).json({
      status: false,
      message: "An error occurred while updating the package. Please try again later.",
      error: error.message,
    });
  }
});