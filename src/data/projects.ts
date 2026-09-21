// The projects, mirroring what the CMS serves.
//
// This array is the compiled-in fallback: what first paint renders, what a standalone build
// renders forever, and what `generateStaticParams` prerenders a page for. Drift here is not
// cosmetic — it once held six projects against twelve live, prerendered `/projects/lazarus`
// for a project that no longer existed, and claimed `/projects/sar` after the CMS had renamed
// it `sar-yield`, so the one URL that existed was the one nothing served.
//
// Regenerated from `/api/content`, currently 14 projects. **Re-sync after any change in
// /admin.** The guards in src/data/os.test.ts check that this file agrees with itself — that
// every desktop label is reachable from Ask Sumit, that every alias points somewhere — not
// that it agrees with D1, and nothing can check that for you.
//
// The types below are the contract both sides share; `worker/map.ts` builds the same shape
// out of D1.

/** A flow diagram row: [step, caption]. */
export type FlowStep = [string, string]

/** A metric row: [label, value, hint?]. */
export type Metric = [string, string, string?]

export type SectionBody =
  | { text: string }
  | { flow: FlowStep[] }
  | { metrics: Metric[] }
  // No project carries a chart today, but /admin can still author one — see
  // worker/admin-ui/Fields.tsx. Narrowing this would deny a body the CMS is able to serve.
  | { chart: 'sar-mse' }

export type ProjectSection = {
  heading?: string
  body: SectionBody
}

export type ProjectLink = {
  label: string
  url: string
}

export type Project = {
  id: string
  title: string
  tagline: string
  status: { label: string; ok: boolean }
  stack: string[]
  sections: ProjectSection[]
  links: ProjectLink[]
  /** Shown under the links — a qualification about what is and is not published. */
  note?: string
  /** Shown as a bordered aside — a caveat about the claims on the card. */
  caveat?: string
}

export const PROJECTS: Project[] = [
  {
    id: 'project-pm25',
    title: 'PM2.5 Forecasting',
    tagline: 'Spatiotemporal PM2.5 forecasting with ConvLSTM + Fourier Neural Operator',
    status: {
      label: 'Live demo · public',
      ok: true,
    },
    stack: [
      'ConvLSTM',
      'Fourier Neural Operator',
      'Hugging Face Spaces',
      'Python',
      'PyTorch',
      'NumPy',
    ],
    sections: [
      {
        heading: 'What it is',
        body: {
          text: 'A spatiotemporal forecasting system that uses historical PM2.5 frames to predict future pollution maps. The model combines ConvLSTM for learning temporal and spatial patterns with a Fourier Neural Operator for capturing broader spatial relationships.',
        },
      },
      {
        heading: 'Architecture',
        body: {
          flow: [
            [
              'Input',
              'Historical PM2.5 frames',
            ],
            [
              'Encode',
              'Learn spatial-temporal features',
            ],
            [
              'ConvLSTM',
              'Model temporal dynamics',
            ],
            [
              'FNO',
              'Capture global spatial patterns',
            ],
            [
              'Decode',
              'Generate future pollution maps',
            ],
            [
              'Output',
              'Predicted PM2.5 frames',
            ],
          ],
        },
      },
      {
        heading: 'Metrics',
        body: {
          metrics: [
            [
              '0.8795',
              'sMAPE',
              'Kaggle Phase 2 score',
            ],
            [
              'Rank 2',
              'Phase 2',
              'ANRF AISEHack pollution forecasting',
            ],
          ],
        },
      },
      {
        heading: 'Deployment',
        body: {
          flow: [
            [
              'Model artifacts',
              'Saved forecasting model',
            ],
            [
              'Hugging Face Spaces',
              'Public demo',
            ],
            [
              'User input',
              'Historical PM2.5 frames',
            ],
            [
              'Inference',
              'Future pollution prediction',
            ],
          ],
        },
      },
    ],
    links: [
      {
        label: 'Live Demo',
        url: 'https://huggingface.co/spaces/sumit1703/pm25-forecasting',
      },
      {
        label: 'View Code',
        url: 'https://github.com/sumitjadhav1703/pm25-forecasting-demo',
      },
    ],
    note: 'Developed for the ANRF AISEHack pollution forecasting challenge and deployed as a public demonstration on Hugging Face Spaces.',
    caveat: 'The public demo is intended for inference and demonstration using the deployed model artifacts; it is not a full training environment.',
  },
  {
    id: 'project-sar-yield',
    title: 'SAR Crop Yield Forecasting',
    tagline: 'Crop-yield forecasting from six Capella X-band SAR passes',
    status: {
      label: 'Case study · validation-first',
      ok: true,
    },
    stack: [
      'Capella Space X-band SAR',
      'Unsupervised optimisation',
      'Remote sensing',
      'Python',
      'GDAL',
      'Sentinel-2',
      'Sentinel-1',
      'NASA POWER',
      'GeoPandas',
      'Rasterio',
      'NumPy',
      'Pandas',
    ],
    sections: [
      {
        heading: 'What it is',
        body: {
          text: 'A validation-first crop-yield forecasting pipeline for 966 farm plots in Sokhda, Gujarat. It uses six Capella X-band SAR acquisitions to derive a season-complete canopy signal and modulate crop reference yields into a final plot-level harvest forecast.',
        },
      },
      {
        heading: 'Forecasting pipeline',
        body: {
          flow: [
            [
              'Capella SAR',
              'Six X-band HH acquisitions',
            ],
            [
              'Calibration',
              'Scene-specific radiometric processing',
            ],
            [
              'Geocoding',
              'Terrain-aware SAR registration',
            ],
            [
              'Co-registration',
              'Align all six acquisitions',
            ],
            [
              'Canopy signal',
              'Derive season-complete signed departure',
            ],
            [
              'Yield reference',
              'Crop-specific reference yield',
            ],
            [
              'Modulation',
              'Apply canopy-based factor',
            ],
            [
              'Forecast',
              'Aggregate plot-level yield',
            ],
          ],
        },
      },
      {
        heading: 'Core Formula',
        body: {
          text: 'Y_final(plot) = Y_ref(crop, 2025) × a(season-complete canopy integral)',
        },
      },
      {
        heading: 'Core model',
        body: {
          flow: [
            [
              'Crop reference yield',
              'Season reference based on published agricultural estimates',
            ],
            [
              'Canopy integral',
              'Season-complete signed SAR canopy signal',
            ],
            [
              'Modulation',
              'Adjusts the reference according to observed canopy behaviour',
            ],
            [
              'Final plot yield',
              'Predicted harvest yield for each farm plot',
            ],
          ],
        },
      },
      {
        heading: 'Validation',
        body: {
          text: 'Because ground-truth yield labels were unavailable, validation is treated as a primary deliverable. The project uses pre-registered tests, withheld scenes, external optical observations and an independent Sentinel-1 check to stress-test the forecasting assumptions before shipping the final estimate.',
        },
      },
      {
        heading: 'Validation result',
        body: {
          metrics: [
            [
              'Forecast',
              '893.9 t',
              'Total predicted harvest',
            ],
            [
              'Area',
              '447.5 ha',
            ],
            [
              'Area-weighted yield',
              '2.00 t/ha',
            ],
            [
              'Farm plots',
              '966',
            ],
          ],
        },
      },
      {
        heading: 'Key validation finding',
        body: {
          text: 'The shipped rule did not beat persistence at 30 days in the back-test. That negative result was retained rather than hidden, and the final method was shipped with a flat post-season hold instead of the earlier decaying projection.',
        },
      },
      {
        heading: 'External observations',
        body: {
          flow: [
            [
              'Sentinel-2',
              'External optical observation used for validation',
            ],
            [
              'Sentinel-1',
              'Independent instrument used without feeding the forecast',
            ],
          ],
        },
      },
      {
        heading: 'Results by crop',
        body: {
          metrics: [
            [
              'Groundnut',
              '331.7',
            ],
            [
              'Maize',
              '273.7',
            ],
            [
              'Rice',
              '128.2',
            ],
            [
              'Bajra',
              '86.6',
            ],
            [
              'Cotton',
              '73.8',
            ],
          ],
        },
      },
    ],
    links: [
      {
        label: 'GitHub',
        url: 'https://github.com/sumitjadhav1703/SAR-Crop_Yield_Forecasting',
      },
    ],
    note: 'ANRF AISEHack 2.0 Round 3 case study using Capella X-band SAR, with Sentinel-2, Sentinel-1 and NASA POWER used for external validation and analysis.',
    caveat: 'No ground-truth yield labels were available, so the forecast cannot be presented as a supervised accuracy result. The back-test was negative at 30 days, and several uncertainty sources come from external assumptions rather than the SAR signal itself.',
  },
  {
    id: 'project-airbnb',
    title: 'NYC Airbnb Room Type Classification',
    tagline: 'Machine learning classification of NYC Airbnb room types with FastAPI',
    status: {
      label: 'Live demo · public',
      ok: true,
    },
    stack: [
      'Scikit-learn',
      'FastAPI',
      'Pandas',
      'Python',
      'NumPy',
      'React',
    ],
    sections: [
      {
        heading: 'What it does',
        body: {
          text: 'A supervised machine learning system that predicts the room type of NYC Airbnb listings from listing features. The trained classifier is exposed through a FastAPI endpoint for prediction requests.',
        },
      },
      {
        heading: 'Architecture',
        body: {
          flow: [
            [
              'Listing data',
              'NYC Airbnb listing features',
            ],
            [
              'Cleaning',
              'Handle missing values and prepare data',
            ],
            [
              'Features',
              'Encode model inputs',
            ],
            [
              'Classifier',
              'Scikit-learn prediction model',
            ],
            [
              'FastAPI',
              'Serve prediction endpoint',
            ],
          ],
        },
      },
      {
        heading: 'Model performance',
        body: {
          metrics: [
            [
              '85.6%',
              'Accuracy',
              'Overall classification accuracy',
            ],
            [
              '74.1%',
              'Macro-F1',
              'Balances performance across room-type classes',
            ],
          ],
        },
      },
      {
        heading: 'API',
        body: {
          text: 'The trained model is wrapped in a FastAPI service that accepts listing features and returns a predicted room type. This separates the machine learning model from the interface used to request predictions.',
        },
      },
    ],
    links: [
      {
        label: 'Live Demo ',
        url: 'https://nyc-airbnb-room-type-classification.vercel.app/',
      },
      {
        label: 'View Code',
        url: 'https://github.com/sumitjadhav1703/NYC_Airbnb_Room_Type_Classification',
      },
    ],
    note: 'Built as an end-to-end supervised learning project covering data preparation, feature encoding, model training and API-based inference.',
    caveat: 'A public GitHub repository is available. A publicly accessible deployed prediction endpoint has not been verified yet.',
  },
  {
    id: 'project-movie-recommendation-system',
    title: 'Movie Recommendation System',
    tagline: 'Content-based movie recommendations with TF-IDF, FastAPI and Streamlit',
    status: {
      label: 'Live demo · public',
      ok: true,
    },
    stack: [
      'Python',
      'Scikit-learn',
      'Pandas',
      'NumPy',
      'FastAPI',
      'Streamlit',
      'TMDB API',
      'Render',
    ],
    sections: [
      {
        heading: 'What it is',
        body: {
          text: 'A full-stack content-based movie recommendation system that analyzes movie metadata and recommends similar titles using TF-IDF vectorization and cosine similarity. The application combines a Streamlit interface with a FastAPI backend and TMDB API integration for movie metadata and posters.',
        },
      },
      {
        heading: 'Recommendation pipeline',
        body: {
          flow: [
            [
              'Movie data',
              'Genres, keywords, cast, crew and overview',
            ],
            [
              'Preprocessing',
              'Combine metadata into text tags',
            ],
            [
              'TF-IDF',
              'Convert text into feature vectors',
            ],
            [
              'Cosine similarity',
              'Calculate movie-to-movie similarity',
            ],
            [
              'Ranking',
              'Select the most similar titles',
            ],
            [
              'TMDB API',
              'Fetch posters and additional metadata',
            ],
          ],
        },
      },
      {
        heading: 'System architecture',
        body: {
          flow: [
            [
              'Streamlit',
              'Interactive user interface',
            ],
            [
              'FastAPI',
              'REST API and prediction service',
            ],
            [
              'ML Artifacts',
              'Precomputed TF-IDF model and similarity data',
            ],
            [
              'TMDB API',
              'Movie posters and additional metadata',
            ],
            [
              'Recommendations',
              'Ranked similar movies returned to the user',
            ],
          ],
        },
      },
      {
        heading: 'Key features',
        body: {
          text: 'Movie recommendations based on content similarity, movie title search, genre-based browsing, detailed movie information, TMDB poster integration and a documented FastAPI backend.',
        },
      },
      {
        heading: 'API',
        body: {
          text: 'The FastAPI backend exposes endpoints for health checks, movie search, recommendations and movie details. Swagger documentation is available through the deployed API.',
        },
      },
    ],
    links: [
      {
        label: 'Live Demo',
        url: 'https://movierecommendationsystem-9xfckfbqbpftjzi4qubqgf.streamlit.app/',
      },
      {
        label: 'GitHub',
        url: 'https://github.com/sumitjadhav1703/movie_recommendation_system',
      },
      {
        label: 'API Docs',
        url: 'https://movie-recommendation-system-t86z.onrender.com/docs',
      },
    ],
    note: 'An end-to-end ML application covering data preprocessing, TF-IDF feature extraction, cosine-similarity retrieval, API development and cloud deployment.',
    caveat: 'The recommendation engine is content-based and does not currently use user-rating history or collaborative filtering.',
  },
  {
    id: 'project-emotion-classification-pipeline',
    title: 'Emotion Classification Pipeline',
    tagline: 'TF-IDF and Logistic Regression emotion classification with Streamlit',
    status: {
      label: 'NLP app · Streamlit',
      ok: true,
    },
    stack: [
      'Python',
      'Scikit-learn',
      'TF-IDF',
      'Logistic Regression',
      'NLTK',
      'Streamlit',
      'Pandas',
      'NumPy',
      'Joblib',
      'Pytest',
    ],
    sections: [
      {
        heading: 'What it does',
        body: {
          text: 'An NLP classification application that predicts the dominant emotion of a text input using a custom preprocessing pipeline, TF-IDF feature extraction and Logistic Regression.',
        },
      },
      {
        heading: 'Text processing pipeline',
        body: {
          flow: [
            [
              'Raw text',
              'User-provided sentence',
            ],
            [
              'Lowercase',
              'Standardize text',
            ],
            [
              'Clean',
              'Remove punctuation and digits',
            ],
            [
              'ASCII filter',
              'Keep supported characters',
            ],
            [
              'Stopwords',
              'Remove common words',
            ],
            [
              'TF-IDF',
              'Convert text to numerical features',
            ],
            [
              'Logistic Regression',
              'Predict emotion',
            ],
            [
              'Output',
              'Emotion + confidence',
            ],
          ],
        },
      },
      {
        heading: 'Model architecture',
        body: {
          flow: [
            [
              'Custom Preprocessor',
              'Text normalization and filtering',
            ],
            [
              'TF-IDF',
              'Transforms text into weighted numerical features',
            ],
            [
              'Logistic Regression',
              'Multiclass emotion classifier',
            ],
            [
              'Output',
              'Predicted emotion and confidence',
            ],
          ],
        },
      },
      {
        heading: 'Results',
        body: {
          metrics: [
            [
              'Accuracy',
              '86.38%',
              'Documented training/evaluation workflow result',
            ],
          ],
        },
      },
      {
        heading: 'Testing',
        body: {
          text: 'The repository includes pytest coverage for training logic, inference behavior, application helpers and project structure, making the ML pipeline easier to verify and maintain.',
        },
      },
      {
        heading: 'Deployment',
        body: {
          text: 'The application is structured for deployment on Streamlit Community Cloud. The serialized model artifact is loaded at inference time so the deployed application does not retrain the model during startup.',
        },
      },
    ],
    links: [
      {
        label: 'Live Demo',
        url: 'https://sentimentanalysis-wh9jm3eczbzx8fyyobjvm7.streamlit.app/',
      },
      {
        label: 'GitHub',
        url: 'https://github.com/sumitjadhav1703/Sentiment_analysis',
      },
    ],
    note: 'An end-to-end NLP project covering reproducible training, custom preprocessing, model serialization, inference separation, automated tests and Streamlit deployment preparation.',
    caveat: 'The current model uses TF-IDF and Logistic Regression, so its understanding is limited by the training vocabulary and feature representation. More context-aware transformer models could improve handling of complex language.',
  },
  {
    id: 'project-credit-risk-ml-system',
    title: 'Credit Risk ML System',
    tagline: 'Explainable credit risk prediction with calibrated XGBoost and SHAP',
    status: {
      label: 'Live · FastAPI · Explainable ML',
      ok: true,
    },
    stack: [
      'Python',
      'Pandas',
      'Scikit-learn',
      'XGBoost',
      'SHAP',
      'FastAPI',
      'Pydantic',
      'Joblib',
      'Render',
    ],
    sections: [
      {
        heading: 'What it is',
        body: {
          text: 'An end-to-end credit risk assessment system that uses a calibrated XGBoost classifier to estimate default probability, applies an optimized decision threshold for risk classification, and explains predictions using SHAP feature attributions.',
        },
      },
      {
        heading: 'ML pipeline',
        body: {
          flow: [
            [
              'Credit data',
              '32,581 loan records',
            ],
            [
              'Cleaning',
              'Remove duplicates and invalid records',
            ],
            [
              'Preprocessing',
              'Imputation + one-hot encoding',
            ],
            [
              'XGBoost',
              'Train tuned classifier',
            ],
            [
              'Calibration',
              '5-fold Sigmoid calibration',
            ],
            [
              'Threshold',
              'Optimize F1-based decision cutoff',
            ],
            [
              'SHAP',
              'Explain model predictions',
            ],
          ],
        },
      },
      {
        heading: 'System architecture',
        body: {
          flow: [
            [
              'FastAPI',
              'REST API with Pydantic input validation',
            ],
            [
              'Calibrated Model',
              'Sigmoid-calibrated XGBoost pipeline',
            ],
            [
              'Threshold',
              'Optimized at 0.6951976431239382',
            ],
            [
              'Risk Probability',
              'Estimated probability of default',
            ],
            [
              'Verdict',
              'High Risk or Low Risk',
            ],
          ],
        },
      },
      {
        heading: 'Model performance',
        body: {
          metrics: [
            [
              'Test Accuracy',
              '92%',
              'Tuned XGBoost on 6,305 test samples',
            ],
            [
              'Class 1 F1',
              '0.81',
              'Default class performance',
            ],
            [
              'Average Precision',
              '0.90',
              '5-fold CV tuning score',
            ],
            [
              'Decision Threshold',
              '0.6952',
              'Precision-Recall F1 optimization',
            ],
          ],
        },
      },
      {
        heading: 'Explainability',
        body: {
          text: 'SHAP TreeExplainer is used for both global and local interpretation. Global explanations rank important risk drivers, while local waterfall explanations show how individual features push a prediction relative to the model baseline.',
        },
      },
      {
        heading: 'Key risk signals',
        body: {
          text: 'The documented SHAP analysis identifies loan_percent_income, loan_int_rate, person_income and loan_grade among the primary model features influencing default predictions.',
        },
      },
      {
        heading: 'API',
        body: {
          text: 'The FastAPI service exposes a health endpoint and a POST /predict endpoint. The prediction endpoint validates loan application fields with Pydantic and returns default probability, binary prediction, the configured threshold and a High Risk or Low Risk result.',
        },
      },
      {
        heading: 'Dataset',
        body: {
          metrics: [
            [
              'Raw Records',
              '32,581',
            ],
            [
              'Cleaned Records',
              '32,416',
            ],
            [
              'Test Samples',
              '6,305',
            ],
          ],
        },
      },
      {
        heading: 'Deployment',
        body: {
          flow: [
            [
              'Serialized Model',
              'credit_risk_model.pkl + best_threshold.pkl',
            ],
            [
              'FastAPI',
              'Model-serving runtime',
            ],
            [
              'Render',
              'Cloud deployment configuration',
            ],
            [
              'Credit Ledger',
              'Browser-based underwriting dashboard',
            ],
          ],
        },
      },
    ],
    links: [
      {
        label: 'Live Demo',
        url: 'https://credit-risk-ml-system-btnj.onrender.com/',
      },
      {
        label: 'GitHub',
        url: 'https://github.com/sumitjadhav1703/credit-risk-ml-system',
      },
    ],
    note: 'An engineering-focused credit-risk demonstration combining model calibration, threshold optimization, SHAP explainability, REST inference and a browser underwriting interface.',
    caveat: 'This is an engineering demonstration, not a certified automated credit-underwriting system. Real-world deployment would require regulatory review, fairness testing, institutional risk policies and ongoing model monitoring.',
  },
  {
    id: 'project-emotion-classification-with-bigru',
    title: 'Emotion Classification with BiGRU',
    tagline: 'Six-class emotion classification with BiGRU and FastAPI',
    status: {
      label: 'Live demo · public',
      ok: true,
    },
    stack: [
      'Python',
      'TensorFlow / Keras',
      'BiGRU',
      'FastAPI',
      'Pydantic',
      'NumPy',
      'HTML',
      'CSS',
      'JavaScript',
      'Render',
    ],
    sections: [
      {
        heading: 'What it does',
        body: {
          text: 'A deep learning NLP application that classifies English text into six emotion categories using a Bidirectional GRU model. The trained model is exposed through FastAPI and an interactive web interface.',
        },
      },
      {
        heading: 'Inference pipeline',
        body: {
          flow: [
            [
              'User text',
              'Raw text input',
            ],
            [
              'Preprocessing',
              'Lowercase, punctuation removal and normalization',
            ],
            [
              'Tokenizer',
              'Convert text into integer sequences',
            ],
            [
              'Padding',
              'Normalize sequence length to 50 tokens',
            ],
            [
              'BiGRU',
              'Run contextual sequence inference',
            ],
            [
              'Softmax',
              'Generate six-class probabilities',
            ],
            [
              'Response',
              'Return emotion and confidence',
            ],
          ],
        },
      },
      {
        heading: 'Model architecture',
        body: {
          flow: [
            [
              'Embedding',
              '300-dimensional word embeddings',
            ],
            [
              'BiGRU',
              '128 units, bidirectional',
            ],
            [
              'BiGRU',
              '64 units, bidirectional',
            ],
            [
              'Output',
              'Six-class probability distribution',
            ],
          ],
        },
      },
      {
        heading: 'Results',
        body: {
          metrics: [
            [
              '92.10%',
              'Test Accuracy',
              'BiGRU test-set performance',
            ],
            [
              '0.2257',
              'Test Loss',
              'BiGRU test-set loss',
            ],
          ],
        },
      },
      {
        heading: 'API',
        body: {
          text: 'The FastAPI service exposes a prediction endpoint that accepts text and returns the predicted emotion, confidence score and probability distribution across all six classes. A health endpoint reports server and model-loading status.',
        },
      },
      {
        heading: 'Deployment',
        body: {
          flow: [
            [
              'Model Artifacts',
              'Saved BiGRU model and tokenizer',
            ],
            [
              'FastAPI',
              'Inference and API layer',
            ],
            [
              'Render',
              'Cloud deployment',
            ],
            [
              'Web UI / API',
              'Interactive prediction interface',
            ],
          ],
        },
      },
    ],
    links: [
      {
        label: 'Live Demo',
        url: 'https://emotion-classification-with-bigru.onrender.com',
      },
      {
        label: 'API Docs',
        url: 'https://emotion-classification-with-bigru.onrender.com/docs',
      },
      {
        label: 'GitHub',
        url: 'https://github.com/sumitjadhav1703/Emotion_Classification_With_BiGRU',
      },
    ],
    note: 'An end-to-end NLP deep learning project covering model training, text preprocessing, model serialization, FastAPI inference and cloud deployment.',
    caveat: 'Predictions are statistical classifications and should not be interpreted as a person\'s actual psychological or emotional state. The model may struggle with sarcasm, ambiguity, slang and out-of-domain or non-English text.',
  },
  {
    id: 'project-heart-disease-risk-prediction',
    title: 'Heart Disease Risk Prediction',
    tagline: 'KNN-based heart disease risk prediction with Streamlit',
    status: {
      label: 'Working · Streamlit app',
      ok: true,
    },
    stack: [
      'Python',
      'Scikit-learn',
      'KNN',
      'Streamlit',
      'Pandas',
      'NumPy',
      'Joblib',
    ],
    sections: [
      {
        heading: 'What it does',
        body: {
          text: 'An educational machine learning application that uses clinical and exercise-related input features to classify a case into a low-risk or high-risk category using a trained K-Nearest Neighbors model.',
        },
      },
      {
        heading: 'Prediction pipeline',
        body: {
          flow: [
            [
              'User input',
              'Clinical and exercise-related attributes',
            ],
            [
              'DataFrame',
              'Build a single prediction row',
            ],
            [
              'Feature alignment',
              'Match training feature columns',
            ],
            [
              'Scaling',
              'Apply saved scaler',
            ],
            [
              'KNN',
              'Predict risk class',
            ],
            [
              'Result',
              'Display low/high risk',
            ],
          ],
        },
      },
      {
        heading: 'Input features',
        body: {
          text: 'The application uses age, sex, chest pain type, resting blood pressure, cholesterol, fasting blood sugar, resting ECG, maximum heart rate, exercise-induced angina, ST depression and ST slope as prediction inputs.',
        },
      },
      {
        heading: 'Model architecture',
        body: {
          flow: [
            [
              'Encoded Features',
              'User inputs aligned to training columns',
            ],
            [
              'Saved Scaler',
              'Applies the same scaling used during training',
            ],
            [
              'KNN Model',
              'Trained scikit-learn classifier',
            ],
            [
              'Risk Classification',
              'Low Risk or High Risk',
            ],
          ],
        },
      },
      {
        heading: 'ML implementation',
        body: {
          text: 'The application loads a trained KNN classifier together with the scaler and expected feature-column structure used during training. Incoming user data is transformed to match that structure before inference.',
        },
      },
    ],
    links: [
      {
        label: 'Live Demo',
        url: 'https://heart-design-prediction-projects-jalm5zpuzdywk5eeahrb7z.streamlit.app/',
      },
      {
        label: 'GitHub',
        url: 'https://github.com/sumitjadhav1703/Heart-Disease-Prediction-Projects',
      },
    ],
    note: 'A beginner-friendly end-to-end ML project demonstrating preprocessing consistency, saved model artifacts and interactive Streamlit inference.',
    caveat: 'Educational demonstration only. The prediction is not a medical diagnosis and should not be used to make healthcare decisions. Model performance depends on the training data and may not generalize to real clinical settings.',
  },
  {
    id: 'project-next-word-prediction',
    title: 'Next Word Prediction',
    tagline: 'LSTM and n-gram next-word prediction with lightweight web deployment',
    status: {
      label: 'Live demo · public',
      ok: true,
    },
    stack: [
      'Python',
      'TensorFlow',
      'Keras',
      'LSTM',
      'N-gram',
      'Streamlit',
      'Pandas',
      'NumPy',
    ],
    sections: [
      {
        heading: 'What it is',
        body: {
          text: 'A next-word prediction system that predicts likely words from a given text fragment. The project explores two approaches: an LSTM deep learning model for sequence modeling and a lightweight n-gram predictor for fast web deployment.',
        },
      },
      {
        heading: 'NLP pipeline',
        body: {
          flow: [
            [
              'Raw text',
              'User-provided seed text',
            ],
            [
              'Cleaning',
              'Normalize and lowercase text',
            ],
            [
              'Tokenization',
              'Convert words to token IDs',
            ],
            [
              'Sequence generation',
              'Build fixed-length contexts',
            ],
            [
              'Padding',
              'Prepare model input',
            ],
            [
              'Prediction',
              'LSTM or n-gram inference',
            ],
            [
              'Output',
              'Ranked next-word predictions',
            ],
          ],
        },
      },
      {
        heading: 'LSTM model',
        body: {
          text: 'The deep learning model uses an embedding layer followed by a 128-unit LSTM and a Dense softmax output over the vocabulary. The documented configuration uses an embedding dimension of 50, sequence length of 745 and a vocabulary of 8,978 words.',
        },
      },
      {
        heading: 'Dataset',
        body: {
          metrics: [
            [
              '3,038',
              'Quotes',
            ],
            [
              '8,978',
              'Vocabulary',
            ],
            [
              '745',
              'Max sequence length',
            ],
          ],
        },
      },
      {
        heading: 'Deployment',
        body: {
          text: 'The deployed application uses a lightweight n-gram predictor that searches up to a 5-word context and returns the most frequently observed next-word transitions.',
        },
      },
      {
        heading: 'Evaluation',
        body: {
          text: 'The LSTM training process uses categorical crossentropy and categorical accuracy. Because the dataset contains only 3,038 quotes, the project also uses qualitative inspection of generated text rather than presenting a misleading single benchmark score.',
        },
      },
      {
        heading: 'Performance',
        body: {
          metrics: [
            [
              '<10 ms',
              'N-gram prediction',
            ],
            [
              '50–100 ms',
              'LSTM generation',
            ],
            [
              '7.5 MB',
              'LSTM artifact',
            ],
          ],
        },
      },
    ],
    links: [
      {
        label: 'GitHub',
        url: 'https://github.com/sumitjadhav1703/Next_word_prediction',
      },
      {
        label: 'Live Demo',
        url: 'https://nextwordprediction-gj6q3h2okjbqevqbmzuw43.streamlit.app/',
      },
    ],
    note: 'An NLP project exploring sequence modeling, LSTM training, statistical n-gram prediction and deployment under lightweight runtime constraints.',
    caveat: 'The model is trained on a relatively small collection of about 3,000 quotes, so its vocabulary and context are limited and it may generalize poorly to conversational, technical or modern text.',
  },
  {
    id: 'project-mental-health-score',
    title: 'Mental Health Score',
    tagline: 'Student wellness analytics with Random Forest regression and FastAPI',
    status: {
      label: 'Live demo · public',
      ok: true,
    },
    stack: [
      'Python',
      'FastAPI',
      'Pydantic',
      'scikit-learn',
      'Pandas',
      'NumPy',
      'Random Forest',
      'HTML',
      'CSS',
      'JavaScript',
      'Render',
    ],
    sections: [
      {
        heading: 'What it does',
        body: {
          text: 'A predictive analytics application that uses demographic, social-media and lifestyle inputs to estimate a continuous wellness-related score with a tuned Random Forest regression model.',
        },
      },
      {
        heading: 'Prediction pipeline',
        body: {
          flow: [
            [
              'User inputs',
              'Demographic and lifestyle information',
            ],
            [
              'Validation',
              'Pydantic validates incoming data',
            ],
            [
              'Preprocessing',
              'Numeric and categorical transformations',
            ],
            [
              'Random Forest',
              'Tuned regression model',
            ],
            [
              'Prediction',
              'Continuous score',
            ],
            [
              'API response',
              'JSON prediction returned to client',
            ],
          ],
        },
      },
      {
        heading: 'ML pipeline',
        body: {
          flow: [
            [
              'Numeric features',
              'Scaled; Study Hours additionally uses log1p transformation',
            ],
            [
              'Ordinal feature',
              'Stress level encoded by ordered categories',
            ],
            [
              'Categorical features',
              'One-hot encoded',
            ],
            [
              'Model',
              'Random Forest Regressor tuned with RandomizedSearchCV',
            ],
          ],
        },
      },
      {
        heading: 'Key features',
        body: {
          text: 'Interactive student lifestyle input form, Pydantic validation, tuned Random Forest inference, FastAPI REST endpoints, health monitoring and a responsive browser interface.',
        },
      },
      {
        heading: 'API',
        body: {
          text: 'The FastAPI backend exposes a prediction endpoint that accepts validated student and lifestyle features and returns a continuous predicted score. A health endpoint reports service and model-loading status.',
        },
      },
    ],
    links: [
      {
        label: 'Live Demo',
        url: 'https://mental-health-score-1-xq8w.onrender.com',
      },
      {
        label: 'API Docs',
        url: 'https://mental-health-score-1-xq8w.onrender.com/docs',
      },
      {
        label: 'GitHub',
        url: 'https://github.com/sumitjadhav1703/Mental_Health_Score',
      },
    ],
    note: 'An end-to-end machine learning application covering feature preprocessing, hyperparameter tuning, model serialization, API validation and cloud deployment.',
    caveat: 'This is a predictive analytics demonstration, not a clinical or diagnostic tool. Predictions are statistical estimates derived from the training data and may not reflect an individual\'s actual mental or emotional state.',
  },
  {
    id: 'project-ai-video',
    title: 'AI Video Assistant',
    tagline: 'Multi-modal RAG pipeline',
    status: {
      label: 'Live demo · code private',
      ok: true,
    },
    stack: [
      'LangChain',
      'Mistral AI',
      'FastAPI',
      'Docker',
      'PostgreSQL / pgvector',
      'Python',
      'Git',
      'GitHub',
      'React',
    ],
    sections: [
      {
        heading: 'What it is',
        body: {
          text: 'A multi-modal RAG pipeline for uploaded video and audio that combines transcription, semantic retrieval and Mistral AI to support summarisation and conversational question answering.',
        },
      },
      {
        heading: 'Pipeline',
        body: {
          flow: [
            [
              'Upload',
              'Video / audio',
            ],
            [
              'Transcribe',
              'Speech to text',
            ],
            [
              'Embed',
              'Store embeddings in pgvector',
            ],
            [
              'Retrieve',
              'Retrieve top-k relevant chunks',
            ],
            [
              'Mistral AI',
              'Mistral AI produces a grounded answer',
            ],
          ],
        },
      },
      {
        heading: 'Deployment',
        body: {
          flow: [
            [
              'React',
              'User interface',
            ],
            [
              'FastAPI',
              'Service layer',
            ],
            [
              'Docker',
              'Packaging',
            ],
            [
              'Render',
              'API hosting',
            ],
          ],
        },
      },
      {
        heading: 'What I built',
        body: {
          text: 'The system accepts uploaded media, converts speech into searchable text, stores embeddings for retrieval, and uses retrieved context to generate grounded answers to user questions about the uploaded content.',
        },
      },
      {
        heading: 'Key capabilities',
        body: {
          text: '• Video and audio ingestion\n• Speech-to-text transcription\n• Semantic retrieval with pgvector\n• Context-grounded question answering\n• AI-assisted summarisation\n• API-based backend with FastAPI\n• Containerised deployment with Docker',
        },
      },
    ],
    links: [
      {
        label: 'Demo link',
        url: 'https://ai-video-assistant-iota.vercel.app/',
      },
      {
        label: 'View Code',
        url: 'https://github.com/sumitjadhav1703/AI-Video-Assistant',
      },
    ],
    note: 'Built as a production-oriented RAG application combining a Streamlit interface, FastAPI backend, PostgreSQL/pgvector retrieval and Mistral AI generation.',
    caveat: 'The source repository is public. The public demo link will be added once the deployed endpoint is finalized.',
  },
  {
    id: 'project-multi-agent',
    title: 'Multi-Agent Research System',
    tagline: 'Four-agent research workflow with search, analysis, writing and critique',
    status: {
      label: 'Live demo · public',
      ok: true,
    },
    stack: [
      'LangChain',
      'Search / Reader / Writer / Critic',
      'LangGraph',
      'Mistral AI',
      'Tavily',
      'Python',
      'Streamlit',
    ],
    sections: [
      {
        heading: 'What it is',
        body: {
          text: 'A multi-agent research workflow designed to explore how specialized AI agents can divide a research task into source discovery, information extraction, report writing and critical review.',
        },
      },
      {
        heading: 'Agent pipeline',
        body: {
          flow: [
            [
              'Search',
              'Finds relevant sources',
            ],
            [
              'Reader',
              'Extracts useful claims and information',
            ],
            [
              'Writer',
              'Combines findings into a research brief',
            ],
            [
              'Critic',
              'Reviews the draft and identifies weaknesses',
            ],
          ],
        },
      },
      {
        heading: 'Architecture',
        body: {
          flow: [
            [
              'User Query',
              'Research topic or question',
            ],
            [
              'Search Agent',
              'Finds relevant web sources',
            ],
            [
              'Reader Agent',
              'Extracts claims and useful evidence',
            ],
            [
              'Writer Agent',
              'Produces a structured research brief',
            ],
            [
              'Critic Agent',
              'Reviews the draft for weaknesses',
            ],
            [
              'Final Research Brief',
              'Refined research output',
            ],
          ],
        },
      },
      {
        heading: 'What I learned',
        body: {
          text: 'The project helped me understand agent orchestration, state passing and handoffs between specialized agents. The main learning came from seeing how errors or incomplete information at one stage can affect every downstream stage.',
        },
      },
      {
        heading: 'Metrics',
        body: {
          metrics: [
            [
              '5/10',
              'Self-rated',
            ],
          ],
        },
      },
    ],
    links: [
      {
        label: 'Live Demo',
        url: 'https://multiagentresearchsystem-f47mjoqmqw8nlxf8uud5v2.streamlit.app/',
      },
      {
        label: 'View Code',
        url: 'https://github.com/sumitjadhav1703/Multi_agent_research_system',
      },
    ],
    note: 'Built as an experimental project to understand multi-agent orchestration, specialized agent roles and inter-agent handoffs using LangChain/LangGraph.',
    caveat: 'This is a learning and experimentation project rather than a production system. The source code is private and there is currently no public deployment.',
  },
  {
    id: 'project-linkedin-post-agent',
    title: 'LinkedIn Post Agent',
    tagline: 'LangGraph agent for human-reviewed and autonomous LinkedIn post generation',
    status: {
      label: 'Live demo · public',
      ok: true,
    },
    stack: [
      'Python',
      'FastAPI',
      'React',
      'Vite',
      'TypeScript',
      'LangGraph',
      'LangChain',
      'Mistral AI',
      'Tavily',
      'Vercel',
      'Render',
    ],
    sections: [
      {
        heading: 'What it is',
        body: {
          text: 'An agentic LinkedIn post generation system built with LangGraph. It supports two execution modes: Human-in-the-Loop, where a person reviews and approves or revises a draft, and Autonomous Generation, where an LLM reviewer evaluates and iteratively refines the post.',
        },
      },
      {
        heading: 'Human-in-the-Loop',
        body: {
          flow: [
            [
              'User',
              'Provides a topic',
            ],
            [
              'Writer',
              'Generates a draft',
            ],
            [
              'Review',
              'Draft is presented for human approval',
            ],
            [
              'Interrupt',
              'LangGraph pauses execution',
            ],
            [
              'Feedback',
              'User approves or requests changes',
            ],
            [
              'Writer',
              'Revises using feedback',
            ],
            [
              'Output',
              'Final LinkedIn post',
            ],
          ],
        },
      },
      {
        heading: 'Autonomous workflow',
        body: {
          flow: [
            [
              'User',
              'Provides a topic',
            ],
            [
              'Writer',
              'Generates a draft',
            ],
            [
              'Reviewer',
              'LLM evaluates the draft',
            ],
            [
              'Decision',
              'Approve or reject',
            ],
            [
              'Revision',
              'Writer refines rejected drafts',
            ],
            [
              'Output',
              'Final post or maximum-attempt result',
            ],
          ],
        },
      },
      {
        heading: 'Architecture',
        body: {
          flow: [
            [
              'React/Vite',
              'Interactive frontend for HITL and autonomous workflows',
            ],
            [
              'FastAPI',
              'HTTP API for starting, resuming and monitoring jobs',
            ],
            [
              'LangGraph',
              'Stateful graph orchestration with loops and interrupts',
            ],
            [
              'Mistral AI',
              'LLM used for writing and autonomous review',
            ],
            [
              'Tavily',
              'Optional web-search augmentation',
            ],
          ],
        },
      },
      {
        heading: 'Engineering insight',
        body: {
          text: 'The project demonstrates that human approval changes more than the UI: pausing a graph requires state checkpointing and a reliable way to resume execution later. The autonomous workflow avoids suspension but introduces an iterative reviewer loop and termination limits.',
        },
      },
      {
        heading: 'API',
        body: {
          text: 'The FastAPI backend exposes separate endpoints for starting and resuming Human-in-the-Loop workflows, starting autonomous jobs, polling job status, and checking service health.',
        },
      },
    ],
    links: [
      {
        label: 'Live Demo',
        url: 'https://linkedin-post-agent-two.vercel.app/',
      },
      {
        label: 'GitHub',
        url: 'https://github.com/sumitjadhav1703/Linkedin_Post_Agent',
      },
      {
        label: 'API',
        url: 'https://linkedin-post-agent-6mrm.onrender.com',
      },
    ],
    note: 'Built to compare human-supervised and autonomous agent execution while keeping the same core writer chain in both workflows.',
    caveat: 'The deployed backend uses in-memory LangGraph checkpointing and runs on Render\'s free tier. A restart can lose paused Human-in-the-Loop sessions, and the service may experience cold starts after inactivity.',
  },
  {
    id: 'project-research-topic-classification',
    title: 'Research Topic Classification',
    tagline: 'Graph Neural Network classification of research topics on the Cora citation network',
    status: {
      label: 'Live · FastAPI + Streamlit',
      ok: true,
    },
    stack: [
      'Python',
      'PyTorch',
      'PyTorch Geometric',
      'Graph Neural Networks',
      'GCN',
      'ONNX Runtime',
      'FastAPI',
      'Streamlit',
      'Pydantic',
      'NumPy',
      'Pandas',
    ],
    sections: [
      {
        heading: 'What it is',
        body: {
          text: 'An end-to-end research topic classification system built on the Cora citation network. It uses a two-layer Graph Convolutional Network to classify research papers into seven academic topics using both paper features and citation relationships.',
        },
      },
      {
        heading: 'ML Pipeline',
        body: {
          flow: [
            [
              'Cora Dataset',
              '2,708 research papers with 1,433-dimensional features and citation links',
            ],
            [
              'Graph Construction',
              'Build the citation graph from paper features and citation edges',
            ],
            [
              '2-Layer GCN',
              'Train a Graph Convolutional Network to classify papers into 7 topics',
            ],
            [
              'Model Evaluation',
              'Evaluate the GCN on the standard Cora test split',
            ],
            [
              'ONNX Export',
              'Export the trained GCN model for lightweight deployment',
            ],
            [
              'ONNX Runtime',
              'Run CPU-based inference using the exported ONNX model',
            ],
            [
              'FastAPI',
              'Expose health, metadata, Cora prediction and custom graph endpoints',
            ],
            [
              'Web / Streamlit',
              'Interactive interfaces for exploring Cora predictions and custom graphs',
            ],
          ],
        },
      },
      {
        heading: 'Model & Dataset',
        body: {
          text: 'The Cora graph contains 2,708 research papers, 10,556 citation edges and 1,433-dimensional node features. The model uses GCNConv(1433 → 32), ReLU, Dropout(0.5), and GCNConv(32 → 7), producing predictions across seven research topics.',
        },
      },
      {
        heading: 'Results',
        body: {
          metrics: [
            [
              'GCN Accuracy',
              '79.2%',
            ],
            [
              'GCN Macro-F1',
              '0.782',
            ],
            [
              'Random Forest Accuracy',
              '58.1%',
            ],
            [
              'Random Forest Macro-F1',
              '0.570',
            ],
          ],
        },
      },
    ],
    links: [
      {
        label: 'Live Demo',
        url: 'https://research-topic-classification.onrender.com',
      },
      {
        label: 'GitHub',
        url: 'https://github.com/sumitjadhav1703/Research_Topic_Classification',
      },
    ],
    note: 'Research-focused graph machine learning project using the standard Cora citation-network benchmark.',
    caveat: 'The reported metrics come from notebook experiments on the standard Cora test split. The model is trained specifically for the seven Cora topic classes and is not a general-purpose research-paper classifier.',
  },
]

export const slugOf = (project: Project): string => project.id.replace(/^project-/, '')

export const projectBySlug = (slug: string): Project | undefined =>
  PROJECTS.find((project) => slugOf(project) === slug)

/** Short, shareable summary used for og:description and the card subtitle. */
export const summaryOf = (project: Project): string =>
  `${project.tagline} · ${project.stack.slice(0, 4).join(', ')}`
