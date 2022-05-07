# SCRT Millionaire's Problem

## General Description

This is a sample implementation of the Millionaire's Problem, where 2 numbers must be secretly compared with only their final comparison being revealed. 

Each message input takes in its own verification key as well as the signed message. The output contains the comparing address pair and which address sourced the larger number.

[This file](./sign_messages.py) is used to generate verification keys and signatures.