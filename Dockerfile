FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["sh", "-c", "python3 manage.py collectstatic --noinput && python3 manage.py migrate --noinput && python3 manage.py create_superuser_env && gunicorn config.wsgi --bind 0.0.0.0:${PORT:-8000} --log-file -"]