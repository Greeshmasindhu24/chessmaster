from datetime import date, timedelta

import pytest
from pydantic import ValidationError

from app.schemas.auth import Country, Gender, UserRegister, validate_date_of_birth


def test_register_requires_profile_fields():
    with pytest.raises(ValidationError):
        UserRegister(email="a@b.com", username="player1", password="password123")


def test_register_rejects_under_13():
    too_young = date.today() - timedelta(days=365 * 12)
    with pytest.raises(ValidationError, match="13"):
        UserRegister(
            email="young@b.com",
            username="youngster",
            password="password123",
            date_of_birth=too_young,
            gender=Gender.MALE,
        )


def test_register_accepts_valid_profile():
    dob = date.today().replace(year=date.today().year - 20)
    user = UserRegister(
        email="adult@b.com",
        username="adultplayer",
        password="password123",
        date_of_birth=dob,
        gender=Gender.PREFER_NOT_TO_SAY,
        country=Country.INDIAN,
    )
    assert user.country == Country.INDIAN
    assert user.gender == Gender.PREFER_NOT_TO_SAY


def test_register_country_optional():
    dob = date.today().replace(year=date.today().year - 20)
    user = UserRegister(
        email="nocountry@b.com",
        username="nocountry",
        password="password123",
        date_of_birth=dob,
        gender=Gender.MALE,
    )
    assert user.country is None


def test_validate_date_of_birth_future():
    with pytest.raises(ValueError, match="future"):
        validate_date_of_birth(date.today() + timedelta(days=1))
