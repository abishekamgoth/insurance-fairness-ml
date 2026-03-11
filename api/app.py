from fastapi import FastAPI
from pydantic import BaseModel
import pickle
import numpy as np

app = FastAPI()

# Load trained model
model = pickle.load(open("../model/model.pkl", "rb"))

# Define input structure
class InsuranceData(BaseModel):
    age: int
    bmi: float
    children: int
    sex_male: int
    smoker_yes: int
    region_northwest: int
    region_southeast: int
    region_southwest: int


@app.get("/")
def home():
    return {"message": "Insurance prediction API"}


@app.post("/predict")
def predict(data: InsuranceData):

    features = np.array([[
        data.age,
        data.bmi,
        data.children,
        data.sex_male,
        data.smoker_yes,
        data.region_northwest,
        data.region_southeast,
        data.region_southwest
    ]])

    prediction = model.predict(features)

    return {"predicted_cost": float(prediction[0])}