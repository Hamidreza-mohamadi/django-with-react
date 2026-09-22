from rest_framework import serializers
from .models import SiteSetting, Contact_Us


class SiteSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteSetting
        fields = '__all__'


class ContactUsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact_Us
        fields = ['name', 'email', 'message']

    def validate_name(self, value):
        if len(value.strip()) < 2:
            raise serializers.ValidationError("نام باید حداقل ۲ حرف باشد.")
        return value.strip()

    def validate_message(self, value):
        if len(value.strip()) < 10:
            raise serializers.ValidationError("متن پیام باید حداقل ۱۰ حرف باشد.")
        return value.strip()

    def validate_email(self, value):
        return value.lower().strip()
