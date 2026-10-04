"""Validated request contracts shared by the API endpoints."""

from typing import Annotated, List, Optional

from pydantic import BaseModel, Field, StringConstraints, model_validator


NonBlankString = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
FiniteAge = Annotated[float, Field(ge=0, allow_inf_nan=False)]
Creatinine = Annotated[float, Field(gt=0, allow_inf_nan=False)]


class PredictGNNRequest(BaseModel):
    drugs: List[NonBlankString] = Field(min_length=1)
    age: FiniteAge = 84.0
    creatinine_min: Creatinine = 1.2
    creatinine_max: Creatinine = 1.8
    creatinine_avg: Creatinine = 1.5

    @model_validator(mode="after")
    def validate_creatinine_range(self):
        if not self.creatinine_min <= self.creatinine_avg <= self.creatinine_max:
            raise ValueError("Creatinine must satisfy min <= average <= max.")
        return self


class SimulateDeprescribeRequest(PredictGNNRequest):
    drug_to_remove: NonBlankString


class IngestAdmissionRequest(BaseModel):
    name: NonBlankString
    age: FiniteAge = 78.0
    gender: NonBlankString = "FEMALE"
    bed: NonBlankString = "Bed 428-A"
    drugs: List[NonBlankString] = Field(min_length=1)
    creatinine: Creatinine = 1.35
    mrn: Optional[NonBlankString] = None


class SignCPOEOrderRequest(BaseModel):
    patient_id: NonBlankString
    action_ids: List[NonBlankString] = Field(min_length=1)
    override_reason: Optional[NonBlankString] = None
    clinician: NonBlankString = "Dr. Sarah Chen, MD"


class MedGemmaPipelineRequest(BaseModel):
    name: NonBlankString
    mrn: NonBlankString
    age: FiniteAge = 84.0
    gender: NonBlankString = "MALE"
    bed: NonBlankString = "Bed 402-A"
    creatinine: Creatinine = 1.80
    creatinine_min: Optional[Creatinine] = 1.20
    creatinine_max: Optional[Creatinine] = 1.80
    creatinine_avg: Optional[Creatinine] = 1.50
    drugs_text: Optional[NonBlankString] = None
    drugs_list: Optional[List[NonBlankString]] = Field(default=None, min_length=1)
    save_to_census: bool = True

    @model_validator(mode="after")
    def validate_inputs(self):
        if not self.drugs_list and not self.drugs_text:
            raise ValueError("Provide at least one medication in drugs_list or drugs_text.")
        cr_min, cr_max, cr_avg = self.creatinine_range()
        if not cr_min <= cr_avg <= cr_max:
            raise ValueError("Creatinine must satisfy min <= average <= max.")
        return self

    def creatinine_range(self):
        cr_min = self.creatinine_min if self.creatinine_min is not None else max(0.01, self.creatinine - 0.3)
        cr_max = self.creatinine_max if self.creatinine_max is not None else self.creatinine
        cr_avg = self.creatinine_avg if self.creatinine_avg is not None else (cr_min + cr_max) / 2.0
        return cr_min, cr_max, cr_avg
