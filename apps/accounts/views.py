# from django.shortcuts import render
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from .serializers import UserCreateSerializer
from rest_framework.views import APIView
from .serializers import ThemeSerializer
from .models import UserProfile

class ThemeView(APIView):
    permission_classes = [IsAuthenticated]

    def get_or_create_profile(self, user):
        profile, _ = UserProfile.objects.get_or_create(user=user)
        return profile

    def get(self, request):
        profile = self.get_or_create_profile(request.user)
        return Response({
            'mode': profile.theme_mode,
            'custom_colors': profile.theme_custom_colors,
        })

    def post(self, request):
        profile = self.get_or_create_profile(request.user)
        profile.theme_mode = request.data.get('mode', profile.theme_mode)
        profile.theme_custom_colors = request.data.get('custom_colors', profile.theme_custom_colors)
        profile.save()
        return Response({
            'mode': profile.theme_mode,
            'custom_colors': profile.theme_custom_colors,
        })

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    serializer = UserCreateSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(
            {'message': 'User created successfully'},
            status=status.HTTP_201_CREATED
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)